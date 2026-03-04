# CYPHER V3 — GLOBAL MARKET DATA FIX PROMPT
## Multi-Agent Resolution for Bloomberg Grid Data Issues

**URGÊNCIA:** Lançamento em poucas horas. A aba Global Markets é a vitrine principal do DApp.

---

## CONTEXTO

A aba "Global Markets" (`/market` → `BloombergGrid.tsx`) é o terminal Bloomberg-style do CYPHER. Ela agrega dados de 5 fontes:
- **Yahoo Finance** (forex, indices, commodities, stocks)
- **CoinGecko** (crypto)
- **FRED** (economic data, fed indicators)
- **NewsAPI** (financial news)
- **Dune Analytics** (DEX volume)

**Problema principal:** Vários painéis estão vazios ou com dados insuficientes porque as APIs externas falham silenciosamente.

---

## STACK & ARQUIVOS CHAVE

- **Stack:** Next.js 14 + TypeScript + Tailwind
- **Framework:** App Router (server routes em `src/app/api/`)
- **Cache:** Redis via `@/lib/cache/redis.config`

### Arquivos relevantes:
```
src/components/market/BloombergGrid.tsx          — Grid principal
src/hooks/useMultiAssetData.ts                   — Hook multi-asset
src/hooks/useEconomicData.ts                     — Hook economic data
src/hooks/useFinancialNews.ts                    — Hook news
src/hooks/useFedIndicators.ts                    — Hook Fed
src/hooks/useDuneAnalytics.ts                    — Hook Dune DEX
src/app/api/market/multi-asset/route.ts          — API multi-asset
src/app/api/market/economic-data/route.ts        — API economic
src/app/api/market/fed-indicators/route.ts       — API Fed
src/app/api/market/financial-news/route.ts       — API news
src/app/api/dune/route.ts                        — API Dune
src/services/yahoo-finance/YahooFinanceService.ts — Yahoo crumb auth
src/services/twelvedata/TwelveDataService.ts     — TwelveData fallback
src/services/fred/FREDService.ts                 — FRED service
src/components/market/panels/IndicesWatchlist.tsx — Indices panel
src/components/market/panels/ForexWatchlist.tsx   — Forex panel
src/components/market/panels/CommoditiesWatchlist.tsx — Commodities panel
src/components/market/panels/CryptoWatchlist.tsx  — Crypto panel
src/components/market/panels/CorrelationMatrix.tsx — Correlation (hardcoded)
src/components/market/panels/MarketBreadth.tsx    — Market breadth
src/components/market/panels/DEXVolumePanel.tsx   — DEX volume
src/components/market/panels/NewsFeed.tsx         — News feed
src/components/market/panels/EconomicDataPanel.tsx — Economic panel
src/components/market/panels/FedIndicatorsPanel.tsx — Fed panel
src/config/api-keys.ts                           — Fallback prices
```

### ENV vars disponíveis:
```
TWELVEDATA_API_KEY=✅ configurada
FRED_API_KEY=✅ configurada
NEWSAPI_KEY=✅ configurada
DUNE_API_KEY=✅ configurada
REDIS_URL=✅ configurada
```

---

## BUG 1: YAHOO FINANCE CRUMB AUTH FALHA NO VERCEL (CRÍTICO)

### Problema
O `YahooFinanceService.ts` usa autenticação por crumb+cookie para acessar o Yahoo Finance v7 API. Isso funciona localmente mas **falha em serverless/edge (Vercel)** porque:
1. O handshake com `fc.yahoo.com` pode ser bloqueado/rate-limited
2. Cookies de sessão não persistem entre invocações serverless
3. O cache de crumb (`cachedCrumb`) vive apenas dentro da mesma instância — em serverless, cada request pode ser uma nova instância

### Impacto
Quando Yahoo falha → **Forex, Indices, Stocks, Commodities e Ticker Bar ficam VAZIOS.** O fallback TwelveData só é tentado se Yahoo retornar **zero resultados**, mas se Yahoo retornar erro 401/403, o cache é invalidado e a próxima chamada tenta de novo — loop infinito de falhas.

### Correção Necessária

**Arquivo:** `src/services/yahoo-finance/YahooFinanceService.ts`

1. **Adicionar fallback imediato:** Se o crumb falhar 2x seguidas, setar um flag `yahooBlocked = true` com TTL de 5 min para evitar retry infinito.

2. **Usar Yahoo v8 API sem crumb como alternativa:** A URL `https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}?interval=1d&range=1d` NÃO precisa de crumb. Implementar como fallback.

**Arquivo:** `src/app/api/market/multi-asset/route.ts`

3. **Melhorar cascata de fallback:**
```typescript
// Tentativa 1: Yahoo Finance v7 (com crumb)
// Tentativa 2: Yahoo Finance v8 (sem crumb)
// Tentativa 3: TwelveData batch
// Tentativa 4: Fallback estático de src/config/api-keys.ts
```

4. **Garantir que TwelveData é tentado MESMO se Yahoo retornar parcialmente:** Atualmente só faz fallback se `!yahooData || Object.keys(yahooData).length === 0`. Deveria fazer fallback se `Object.keys(yahooData).length < 10` (menos de 50% dos símbolos).

5. **Adicionar timeout mais agressivo:** O Yahoo tem timeout de 12s. Para multi-asset que serve o terminal principal, usar 8s com AbortController.

---

## BUG 2: REDIS OBRIGATÓRIO SEM FALLBACK (CRÍTICO)

### Problema
As rotas `economic-data`, `fed-indicators`, e `dune` usam Redis como cache obrigatório:
```typescript
const redis = getRedisClient();
const cached = await redis.get(CACHE_KEY);
```
Se Redis estiver offline ou não configurado em produção, essas APIs retornam **500 Internal Server Error**.

### Correção Necessária

**Arquivo:** `src/app/api/market/economic-data/route.ts`
**Arquivo:** `src/app/api/market/fed-indicators/route.ts`
**Arquivo:** `src/app/api/dune/route.ts`

1. Envolver chamadas Redis em try-catch:
```typescript
let cached: string | null = null;
try {
  const redis = getRedisClient();
  cached = await redis.get(CACHE_KEY);
} catch (redisErr) {
  console.warn('[route] Redis unavailable, skipping cache:', redisErr);
}
```

2. Se Redis falhar no SET, apenas logar warning e continuar:
```typescript
try {
  await redis.set(cacheKey, JSON.stringify(data), 'EX', ttl);
} catch { /* Redis write failed, continue without cache */ }
```

3. Adicionar in-memory fallback cache (Map com TTL) para quando Redis estiver indisponível:
```typescript
const memCache = new Map<string, { data: any; expiresAt: number }>();
```

---

## BUG 3: COMMODITIES INCOMPLETAS (MÉDIO)

### Problema
Apenas Gold (GC=F) e Silver (SI=F) são rastreados. Para um Bloomberg-style terminal, faltam commodities essenciais.

### Correção Necessária

**Arquivo:** `src/services/yahoo-finance/YahooFinanceService.ts`

1. Adicionar ao `YAHOO_SYMBOL_MAP`:
```typescript
'CL=F': 'CL=F',    // Crude Oil WTI
'NG=F': 'NG=F',    // Natural Gas
'PL=F': 'PL=F',    // Platinum
'HG=F': 'HG=F',    // Copper
```

2. Atualizar `ALL_COMMODITY_SYMBOLS`:
```typescript
export const ALL_COMMODITY_SYMBOLS = ['XAU/USD', 'XAG/USD', 'CL=F', 'NG=F', 'PL=F', 'HG=F'];
```

**Arquivo:** `src/app/api/market/multi-asset/route.ts`

3. Atualizar `buildFromYahoo()` para incluir unit correto para cada commodity:
```typescript
const COMMODITY_UNITS: Record<string, string> = {
  'XAU/USD': 'oz', 'XAG/USD': 'oz', 'CL=F': 'barrel',
  'NG=F': 'MMBtu', 'PL=F': 'oz', 'HG=F': 'lb'
};
```

4. Atualizar `buildFromTwelveData()` fallback para incluir as novas commodities.

**Arquivo:** `src/components/market/panels/CommoditiesWatchlist.tsx`

5. Verificar que o componente renderiza corretamente os novos assets com seus respectivos units.

---

## BUG 4: CORRELATION MATRIX ESTÁTICA (BAIXO)

### Problema
`CorrelationMatrix.tsx` usa dados 100% hardcoded. Para um terminal profissional, deveria calcular correlações a partir de dados reais.

### Correção Necessária (Opcional — pode ficar para v2)

**Arquivo:** `src/components/market/panels/CorrelationMatrix.tsx`

1. Opção rápida: Adicionar timestamp e disclaimer "Estimated correlations — Updated monthly"
2. Opção ideal: Criar endpoint `/api/market/correlations-matrix` que calcula Pearson correlation de 30-day returns usando dados do CoinGecko + Yahoo Finance. Cache por 24h no Redis.

---

## BUG 5: NEWS FEED RATE LIMITED (MÉDIO)

### Problema
NewsAPI free tier = 100 requests/dia. Com refresh a cada 15min, são ~96 req/dia — muito próximo do limite.

### Correção Necessária

**Arquivo:** `src/hooks/useFinancialNews.ts` ou `src/app/api/market/financial-news/route.ts`

1. Aumentar o cache TTL das news para 30min (em vez de 15min): `refreshInterval = 1800000`
2. Adicionar Redis cache com TTL de 30min na route para evitar chamadas duplicadas de múltiplos usuários
3. Se NewsAPI retornar 429 (rate limited), mostrar última versão cacheada em vez de erro

---

## BUG 6: DUNE ANALYTICS QUERIES LENTAS (MÉDIO)

### Problema
Queries Dune podem levar 30-60s. Se timeout no Vercel (default 10s para serverless), o painel DEX Volume fica vazio.

### Correção Necessária

**Arquivo:** `src/app/api/dune/route.ts`

1. Adicionar header `maxDuration` para Vercel:
```typescript
export const maxDuration = 60; // Allow up to 60s for Dune queries
```

2. Implementar pattern de "stale-while-revalidate" no client:
- Servir dados cacheados imediatamente
- Revalidar em background

**Arquivo:** `src/services/DuneAnalyticsService.ts`

3. Adicionar timeout explícito de 45s nas chamadas Dune com AbortController.

---

## DISTRIBUIÇÃO DE AGENTES

```
AGENT 1 (Data Pipeline Lead): Bug 1 — Yahoo Finance fallback chain
  Arquivos: YahooFinanceService.ts, multi-asset/route.ts, TwelveDataService.ts
  Prioridade: P0

AGENT 2 (Infrastructure Lead): Bug 2 — Redis fallback + in-memory cache
  Arquivos: economic-data/route.ts, fed-indicators/route.ts, dune/route.ts, lib/cache/
  Prioridade: P0

AGENT 3 (Content Lead): Bug 3 + Bug 4 — Commodities + Correlations
  Arquivos: YahooFinanceService.ts, multi-asset/route.ts, CommoditiesWatchlist.tsx, CorrelationMatrix.tsx
  Prioridade: P1

AGENT 4 (Reliability Lead): Bug 5 + Bug 6 — News rate limit + Dune timeout
  Arquivos: financial-news/route.ts, useFinancialNews.ts, dune/route.ts, DuneAnalyticsService.ts
  Prioridade: P1
```

---

## VALIDAÇÃO PÓS-FIX

```bash
# 1. Build check
npm run build

# 2. Testar API multi-asset localmente
curl http://localhost:3000/api/market/multi-asset/ | jq '.forex | length, .indices | length, .stocks | length, .commodities | length'
# Esperado: >0 para cada categoria

# 3. Testar economic-data sem Redis
REDIS_URL="" curl http://localhost:3000/api/market/economic-data/
# Deve retornar dados (não 500)

# 4. Testar fed-indicators
curl http://localhost:3000/api/market/fed-indicators/ | jq '.currentRate'
# Deve retornar número > 0

# 5. Verificar commodities expandidas
curl http://localhost:3000/api/market/multi-asset/ | jq '.commodities[].symbol'
# Esperado: XAU/USD, XAG/USD, CL=F, NG=F (mínimo)
```

---

## COMANDO PARA EXECUTAR

```bash
claude --dangerously-skip-permissions "Leia o arquivo GLOBAL-MARKET-FIX-PROMPT.md na raiz do projeto e execute TODOS os fixes. Use subagentes paralelos (4 agentes). Priorize Bug 1 (Yahoo Finance fallback) e Bug 2 (Redis fallback) pois são os que causam painéis vazios. NÃO remova funcionalidade existente. Adicione fallbacks defensivos. Rode npm run build após cada mudança para validar."
```
