# CYPHER V3 — QA AUDIT REPORT V2 (LIVE SITE)
## Teste profundo de cypherordifuture.xyz — Todas as features
**Data:** 27 Fev 2026 | **Testador:** Auditoria automatizada + interação real
**Versão:** V2 — inclui testes de wallet, AI, Hacker Yields, Arbitrage, Global Market

---

## RESUMO: 19 bugs encontrados (5 críticos, 5 altos, 9 médios)

| Severidade | Quantidade | Status |
|-----------|-----------|--------|
| CRÍTICA (P0) | 5 | Bloqueia lançamento |
| ALTA (P1) | 5 | Corrigir antes do lançamento |
| MÉDIA (P2) | 9 | Corrigir pós-lançamento |

---

## BUGS CRÍTICOS (P0) — IMPEDIR LANÇAMENTO

### BUG 1: Premium Bypass via localStorage — SUPER ADMIN sem autenticação
**Severidade:** CRÍTICA | **Página:** Todo o site (navbar, /pricing, /settings)
**Reprodução:**
1. Abrir DevTools → Console
2. Executar: `localStorage.setItem('cypher_premium_status', JSON.stringify({isPremium:true, premiumCollection:"SUPER ADMIN", accessTier:"super_admin", _ts:Date.now()}))`
3. Recarregar a página
4. Resultado: Badge "ADMIN" no navbar, /settings mostra "Plan: HACKER YIELDS, $149/mo, Status: ACTIVE"

**Impacto:** Qualquer pessoa com DevTools obtém acesso premium gratuitamente. ZERO receita.
**Nota V2:** O bypass NÃO afeta páginas YHP-gated (Cypher AI, Hacker Yields, Arbitrage abas premium) — essas têm verificação NFT on-chain separada. Porém afeta: navbar badge, /pricing (mostra "Current plan"), /settings/subscription.

**Correção:**
- PremiumContext.tsx: isPremium deve ser `false` por default
- Verificação SEMPRE server-side (Supabase + on-chain NFT check)
- localStorage = cache com TTL 5 min, SEMPRE re-verificar quando expirado
- REMOVER lógica que permite `accessTier: "super_admin"` via client-side

### BUG 2: Página Miners completamente quebrada — NaN em múltiplos campos
**Severidade:** CRÍTICA | **Página:** /miners
**Problemas:**
- Network Hashrate: "Loading..." (nunca carrega)
- Current Difficulty: **"NaN T"**
- Decentralization: **"NaN%"**
- Mining Pools: Unknown 0.0%, BlockFills 0.0%, ULTIMUSPOOL 0.0%
- Recent Blocks: Pool "Unknown" em todos, Reward **"NaN BTC"** em todos

**Impacto:** Página inteira inutilizável. Impressão de produto quebrado.
**Correção:** Verificar API /api/onchain/mining/. Adicionar validação `isNaN()` e fallback "—". Usar optional chaining e nullish coalescing.

### BUG 3: Runes — dados de preço/volume completamente vazios
**Severidade:** CRÍTICA | **Página:** /runes
**Problemas:**
- 24H VOLUME: **0.00 BTC**, MARKET CAP: **0.00 BTC, 0 active listings**
- Todos os runes: Floor Price "— 0", 24H Volume "— 0", Listed "0", 24H Sales "0"
- Nomes e holders carregam normalmente (API UniSat funciona)

**Impacto:** Página parece abandonada.
**Correção:** API de preço/volume de runes (Magic Eden) está falhando. Verificar endpoints e adicionar fallback.

### BUG 4: Pricing inacessível — sem link na navegação principal
**Severidade:** CRÍTICA | **Página:** Navbar
**Problema:** Não existe link para /pricing na barra de navegação PRINCIPAL (visível no desktop). Existe no menu expandido/mobile.
**Impacto:** ZERO conversões — usuários não encontram onde comprar.
**Correção:** Adicionar link "Pricing" visível na navbar desktop (unified-navbar.tsx).

### BUG 5 (NOVO): Índices mostram PREÇO DE ETF ao invés de valor do índice
**Severidade:** CRÍTICA | **Página:** /market (Global Markets → Indices)
**Problema:** O mapeamento ETF→Index (SPY→SPX, QQQ→NDX, DIA→DJI, IWM→RUT) em route.ts troca o SÍMBOLO mas mantém o PREÇO DO ETF.
**Evidências observadas:**
- DJI (Dow Jones) mostra **$489.69** — é o preço do DIA ETF (real: ~$44,000)
- RUT (Russell 2000) mostra **$261.41** — é o preço do IWM ETF (real: ~$2,200)
- SPX (S&P 500) mostra **$685.60** — é o preço do SPY ETF (real: ~$5,950)

**Impacto:** DESTROI CREDIBILIDADE. Qualquer usuário que conhece mercado verá que Dow Jones a $489 é absurdo.
**Correção:** No route.ts, quando mapear ETF→Index, NÃO usar o preço do ETF. Em vez disso:
- Opção A: Multiplicar o preço do ETF pelo fator apropriado (SPY×10≈SPX, QQQ×38≈NDX, DIA×100≈DJI, IWM×8.5≈RUT)
- Opção B (melhor): Não mapear ETFs para índices. Mostrar como ETFs ou buscar índices reais via Yahoo v8 (^GSPC, ^IXIC, ^DJI, ^RUT)
- Yahoo v8 JÁ retorna valores corretos quando chamado diretamente para os símbolos de índice

---

## BUGS ALTOS (P1) — CORRIGIR ANTES DO LANÇAMENTO

### BUG 6: TwelveData Rate Limit — apenas 1 batch de 8 símbolos por chamada
**Severidade:** ALTA | **Página:** /market (Global Markets)
**Problema:** TwelveData free tier = 8 credits/min. O route.ts envia Batch 1 (8 symbols) e Batch 2 (8 symbols) simultaneamente via Promise.all. Resultado: apenas 1 batch recebe dados reais, o outro é rate-limited.
**Evidência:** A cada refresh, METADE dos dados são estáticos:
- Se Batch 1 sucede: EUR/USD, GBP/USD, USD/JPY, SPY, QQQ, XAU/USD, AAPL, NVDA têm dados
- Se Batch 2 sucede: AUD/USD, USD/CHF, USD/CAD, DIA, IWM, TSLA, MSFT, GOOGL têm dados
- AMZN e META NUNCA têm dados (não estão em nenhum batch)
- Todas as commodities (CL=F, NG=F, PL=F, HG=F) SEMPRE estáticas

**Impacto:** ~50% dos dados são estáticos a qualquer momento. Commodities nunca carregam.
**Correção:**
- Enviar batches SEQUENCIALMENTE com delay de 65s entre eles (respeitar rate limit)
- OU usar apenas 1 batch de 8 símbolos priorizados + fallback Yahoo v8 para o resto
- OU upgrade para TwelveData plano pago (mais credits/min)
- Adicionar AMZN e META a um dos batches (atualmente excluídos)
- Adicionar commodity ETF proxies (USO, UNG, PPLT, CPER) ao batch OU confiar em Yahoo v8

### BUG 7: "CONNECTING TO LIVE FEED..." permanece na tela
**Severidade:** ALTA | **Página:** / (Dashboard)
**Problema:** Texto nunca muda para "CONNECTED". WebSocket não se estabelece.
**Impacto:** Visual de "produto em construção".
**Correção:** Remover o texto ou implementar WebSocket real.

### BUG 8: Difficulty mostra "----" no Bitcoin Network panel
**Severidade:** ALTA | **Página:** / (Dashboard)
**Problema:** DIFFICULTY mostra "----" enquanto Hashrate, Block, Mempool, Fees funcionam.
**Correção:** Verificar se API /api/onchain/blocks/ retorna difficulty com nome correto.

### BUG 9: Cypher AI — texto diz "Connect your ETH wallet"
**Severidade:** ALTA | **Página:** /cypher-ai, /hacker-yields, /arbitrage (abas YHP)
**Problema:** Todas as páginas YHP-gated dizem "Connect your ETH wallet and verify Yield Hacker Pass ownership". O DApp é Bitcoin-centric.
**Impacto:** Confunde a identidade da marca Bitcoin.
**Correção:** Trocar "ETH wallet" por "wallet" em todas as 3 páginas.

### BUG 10: Header "8-Exchange" mas tabela mostra 6
**Severidade:** ALTA | **Página:** /arbitrage
**Problema:** Header diz "8-Exchange Real-Time Spread Detection" mas a tabela Live Scanner mostra apenas 6 exchanges (Coinbase, Gate.io, OKX, Bitfinex, KuCoin, Bybit). Faltam Binance e Kraken no Live Scanner (mas aparecem no Exchanges tab).
**Correção:** Ou adicionar as 2 exchanges faltantes, ou mudar header para "6-Exchange".

---

## BUGS MÉDIOS (P2) — CORRIGIR PÓS-LANÇAMENTO

### BUG 11: Coinbase/Binance dados parciais na Exchanges tab
**Severidade:** MÉDIA | **Página:** /market → Exchanges, /arbitrage
**Problema:** Binance mostra price mas Bid/Ask/Spread/Volume tudo "—". Coinbase mostra volume "—" em ambas as páginas.
**Correção:** Verificar APIs dessas exchanges. Coinbase pode não retornar volume 24h.

### BUG 12: BTC Wallet dropdown mostra apenas 2 wallets (deveria ser 8)
**Severidade:** MÉDIA | **Página:** Connect Wallet dropdown
**Problema:** Ao clicar "Connect Wallet", o dropdown mostra apenas Xverse e UniSat. O código suporta 8 wallets (Unisat, Xverse, Magic Eden, Phantom, Leather, OYL, Wizz, Orange).
**Impacto:** Usuários com outras wallets BTC não conseguem conectar.
**Correção:** Verificar a lógica de detecção de wallets instaladas no LaserEyes provider. Pode estar filtrando wallets não instaladas, mas deveria mostrar todas com opção de instalar.

### BUG 13: Cypher AI / Hacker Yields sem botão "Connect Wallet" na página
**Severidade:** MÉDIA | **Página:** /cypher-ai, /hacker-yields
**Problema:** As páginas de bloqueio dizem para conectar wallet mas não têm botão. O usuário precisa ir ao navbar.
**Correção:** Adicionar botão "Connect Wallet" abaixo do texto "REQUIRED: YIELD HACKER PASS NFT".

### BUG 14: FOMC Recent Decisions são de 2024
**Severidade:** MÉDIA | **Página:** /market (FED & FOMC panel)
**Problema:** Recent Decisions: Dec 18 (Hold), Nov 7 (Cut 25bp), Sep 18 (Cut 50bp), Jul 30 (Hold) — de 2024, sem ano nas datas.
**Correção:** Atualizar com decisões de 2025. Adicionar ano às datas.

### BUG 15: Arbitrage History mostra dados mock
**Severidade:** MÉDIA | **Página:** /arbitrage → History tab
**Problema:** 5 trades "ACTIVE", todos com spread 0.0%, profit $0 ou negativo, actual profit "—", detected "0min ago". Dados gerados on-load, não histórico real.
**Impacto:** Pode confundir usuários pensando que o sistema está ativo mas perdendo dinheiro.
**Correção:** Ou mostrar "No trade history yet" quando não há dados reais, ou rotular claramente como "Demo/Simulated".

### BUG 16: DYDX FUNDING mostra "--" no Trading
**Severidade:** MÉDIA | **Página:** /trading
**Correção:** Verificar API do dYdX ou remover se fora do escopo.

### BUG 17: Market Heatmap bottom rows all 0.00%
**Severidade:** MÉDIA | **Página:** /market (Heatmap)
**Problema:** Todos os assets que usam static fallback aparecem com 0.00% no heatmap (AUD/USD, USD/CHF, CL=F, NG=F, PL=F, HG=F, DJI, RUT, TSLA, MSFT, GOOGL, AMZN, META, etc.)
**Impacto:** Heatmap perde utilidade — metade dos assets não mostra mudança.
**Correção:** Relacionado ao BUG 6 (rate limit). Resolver o rate limit resolve o heatmap.

### BUG 18: All commodities ALWAYS static
**Severidade:** MÉDIA | **Página:** /market (Commodities)
**Problema:** Copper $4.50, Crude Oil $70.00, Natural Gas $3.80, Platinum $970.00, Silver $32.50 — SEMPRE estáticos. O Gold às vezes carrega via TwelveData (XAU/USD no Batch 1).
**Correção:** Commodity ETF proxies (USO, UNG, PPLT, CPER) não estão em nenhum batch do TwelveData. Yahoo v8 deveria buscá-los como fallback mas aparentemente falha para futures symbols. Considerar adicionar ao batch ou usar Yahoo v8 com mappings corretos.

### BUG 19: "TERMINAL V3.2" no header tem baixo contraste
**Severidade:** BAIXA | **Página:** / (Dashboard)
**Correção:** Aumentar contraste ou usar cor accent.

---

## TESTES DE SEGURANÇA

### Positivos:
- **Headers HTTP:** CSP, HSTS, X-Frame-Options, X-XSS-Protection, CORS, Permissions-Policy — EXCELENTES
- **Console errors:** ZERO erros JavaScript em todas as páginas
- **/admin:** Retorna 404 (não exposto)
- **YHP Gating:** Páginas protegidas por NFT (Cypher AI, Hacker Yields, Arbitrage tabs) NÃO são afetadas pelo localStorage bypass — usam verificação separada on-chain

### Negativos:
- **BUG 1:** Premium bypass via localStorage é a falha mais grave
- **subscription_cache:** localStorage contém `{"subscriptionTier":"free","subscriptionStatus":"active"}` — o campo `isSubscriptionActive: true` com tier "free" pode causar confusão na lógica de autorização

---

## TESTES DE WALLET

### BTC (Xverse) — FUNCIONA
- Conectou com sucesso via LaserEyes
- Mostrou endereço `35gjAo...RFkM` com saldo 0.00000000 BTC
- Apenas 2 wallets no dropdown (Xverse, UniSat) — deveria mostrar mais (BUG 12)

### EVM (MetaMask) — FUNCIONA
- Conectou automaticamente via wagmi ao clicar "YHP HOLDER" → "Connect ETH"
- Endereço: `0xae36...ddd3` em chain 42161 (Arbitrum One)
- Auto-connect via MetaMask/wagmi funciona bem

### SOL (Phantom) — NÃO TESTÁVEL
- Phantom wallet não foi detectado no dropdown BTC
- Não há botão específico "Connect SOL" visível
- Phantom pode estar disponível via EVM (wagmi) mas não via SOL nativo

---

## O QUE FUNCIONA BEM

| Feature | Status | Notas |
|---------|--------|-------|
| Dashboard | Excelente | BTC price ($65,637), chart, market leaders, headlines, fee estimates, mempool |
| BTC Focus | Excelente | Fear & Greed (13), performance heatmap, correlations, market overview |
| Price Chart | Excelente | Multi-asset, multi-timeframe, dados real-time |
| Bitcoin Network | Bom | Hashrate, block, mempool, fees (exceto difficulty) |
| Market — Crypto | Excelente | 15+ coins com preços, sparklines, market cap, volume |
| Market — News | Excelente | 19 artigos com fonte e sentiment |
| Market — BTC Focus | Excelente | Fear & Greed, correlations, market overview, dominance |
| Market — Exchanges | Bom | 7 exchanges, 5 com dados completos |
| Market — DEX Volume | Excelente | Dune Analytics com 8 protocolos |
| Market — Economic Indicators | Excelente | GDP, CPI, Unemployment, Fed Rate, M2, Consumer Conf |
| Market — Market Breadth | Bom | 7 advancing / 22 declining — dados reais |
| Market — FED & FOMC | Bom | Fed funds rate 4.50%, próxima reunião Mar 18 |
| Trading | Excelente | SMC chart, order book Hyperliquid, sinais com confluência |
| Ordinals | Excelente | 15 coleções, volumes, market cap, listings, owners |
| Swap | Excelente | THORChain + Jupiter + 1inch, multi-chain, clean UI |
| Portfolio | Bom | FIFO/LIFO, risk mgmt, tax report — requer wallet |
| Arbitrage (Live) | Excelente | 6 exchanges real-time, spreads, refresh automático |
| YHP Gating | Bom | Bloqueio funciona corretamente para Cypher AI, Hacker Yields, Arbitrage tabs |
| Settings | Excelente | Todas as abas funcionais |
| Segurança (Headers) | Excelente | CSP, HSTS, XSS, CORS, Permissions-Policy |
| Performance | Bom | Todas as APIs < 2s |

---

## PRIORIDADE DE CORREÇÃO

### ANTES DO LANÇAMENTO (obrigatório):
1. **BUG 1** — Premium bypass localStorage (MAIS URGENTE — impede receita)
2. **BUG 5** — Índices mostrando preço de ETF (DESTROI credibilidade)
3. **BUG 4** — Link para Pricing na navbar
4. **BUG 2** — Miners NaN (remover página ou corrigir)
5. **BUG 7** — Remover "CONNECTING TO LIVE FEED..."

### PRIMEIRAS 24H PÓS-LANÇAMENTO:
6. **BUG 6** — TwelveData rate limit (resolver dados estáticos)
7. **BUG 3** — Runes dados de preço
8. **BUG 8** — Difficulty no dashboard
9. **BUG 9** — Texto "ETH wallet" nas páginas YHP
10. **BUG 10** — "8-Exchange" vs 6

### PRIMEIRA SEMANA:
11-19. Bugs médios restantes

---

## PROMPT PARA CLAUDE CODE — CORREÇÕES URGENTES

```
Use o QA-AUDIT-REPORT-V2.md como contexto. Corrija os 5 bugs que BLOQUEIAM o lançamento:

1. src/contexts/PremiumContext.tsx — NUNCA confiar em localStorage como fonte de verdade.
   O isPremium deve ser false por default e só mudar para true após verificação server-side
   (Supabase subscription check ou on-chain NFT verification). O cache em localStorage
   deve ter TTL de 5 minutos e SEMPRE re-verificar quando expirado.
   REMOVER qualquer lógica que permita accessTier "super_admin" via client-side.

2. src/app/api/market/multi-asset/route.ts — CORRIGIR o mapeamento ETF→Index.
   NUNCA usar preço de ETF como preço de índice. Opções:
   a) REMOVER o mapeamento ETF_TO_INDEX e TD_COMMODITY_ALTERNATIVES do TwelveData
   b) Deixar Yahoo v8 buscar os índices reais (^GSPC, ^IXIC, ^DJI, ^RUT)
   c) Se TwelveData retorna ETF, NÃO mapear para índice — mostrar como ETF ou pular

3. src/app/api/market/multi-asset/route.ts — CORRIGIR o rate limit do TwelveData.
   NÃO enviar Batch 1 e Batch 2 simultaneamente. Enviar apenas Batch 1 (8 symbols)
   e confiar em Yahoo v8 para o resto. OU enviar sequencialmente com delay.

4. src/app/miners/page.tsx — Adicionar validação isNaN() e fallback "—" para todos
   os campos numéricos. Usar optional chaining e nullish coalescing.

5. src/components/layout/unified-navbar.tsx — Adicionar link visível para /pricing
   na navbar desktop.

BONUS: Remover ou substituir "CONNECTING TO LIVE FEED..." no Dashboard.
```
