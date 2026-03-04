# CYPHER V3 — QA AUDIT REPORT (LIVE SITE)
## Teste completo de cypherordifuture.xyz como usuário real
**Data:** 27 Fev 2026 | **Testador:** Auditoria automatizada

---

## RESUMO: 14 bugs encontrados (4 críticos, 4 altos, 6 médios)

---

## BUGS CRÍTICOS (P0) — IMPEDIR LANÇAMENTO

### BUG 1: Premium Bypass via localStorage — SUPER ADMIN sem autenticação
**Severidade:** CRÍTICA | **Página:** Todo o site
**Reprodução:**
1. Abrir DevTools → Console
2. Executar: `localStorage.setItem('cypher_premium_status', JSON.stringify({isPremium:true, premiumCollection:"SUPER ADMIN", accessTier:"super_admin", _ts:Date.now()}))`
3. Recarregar a página
4. Resultado: TODAS as features premium desbloqueadas, badge ADMIN no navbar

**Impacto:** Qualquer pessoa com conhecimento básico de DevTools obtém acesso completo gratuitamente. ZERO receita.
**Evidência:** localStorage continha `cypher_premium_status: {isPremium:true, premiumCollection:"SUPER ADMIN", accessTier:"super_admin"}` SEM wallet conectada.

**Correção:** A verificação premium NUNCA deve confiar em localStorage como fonte de verdade. Deve:
- Sempre verificar server-side (Supabase subscription status + on-chain NFT check)
- localStorage deve ser apenas cache com TTL curto (5 min max)
- Se cache expirado, forçar re-verificação server-side antes de liberar acesso
- Remover a lógica que permite `accessTier: "super_admin"` via client-side

### BUG 2: Página Miners completamente quebrada — NaN em múltiplos campos
**Severidade:** CRÍTICA | **Página:** /miners
**Problemas:**
- Network Hashrate: "Loading..." (nunca carrega)
- Current Difficulty: **"NaN T"**
- Decentralization: **"NaN%"**
- Mining Pools: Unknown 0.0%, BlockFills 0.0%, ULTIMUSPOOL 0.0% (dados incorretos)
- Recent Blocks: Pool "Unknown" em todos, Reward **"NaN BTC"** em todos

**Impacto:** Página inteira inutilizável. Dá impressão de produto quebrado.
**Correção:** Verificar a API /api/onchain/mining/ — provavelmente retorna dados em formato inesperado. Adicionar validação de `isNaN()` e `|| 0` em todos os cálculos numéricos. Mostrar "—" ao invés de "NaN".

### BUG 3: Runes — dados de preço/volume completamente vazios
**Severidade:** CRÍTICA | **Página:** /runes
**Problemas:**
- 24H VOLUME: **0.00 BTC**
- MARKET CAP: **0.00 BTC, 0 active listings**
- Todos os runes na tabela: Floor Price "— 0", 24H Volume "— 0", Listed "0", 24H Sales "0"
- Nomes e holders carregam normalmente (API UniSat funciona)

**Impacto:** A página parece abandonada — dados essenciais ausentes.
**Correção:** A API de preço/volume de runes (provavelmente Magic Eden) está falhando. Verificar src/app/api/runes/ endpoints e adicionar fallback.

### BUG 4: Pricing inacessível — sem link na navegação
**Severidade:** CRÍTICA | **Página:** Navbar
**Problema:** Não existe link para /pricing na barra de navegação principal. A página só é acessível por URL direta.
**Impacto:** Nenhum usuário consegue encontrar onde comprar um plano → ZERO conversões.
**Correção:** Adicionar link "Pricing" ou ícone na navbar (unified-navbar.tsx). Sugestão: entre PREMIUM badge e Connect Wallet.

---

## BUGS ALTOS (P1) — CORRIGIR ANTES DO LANÇAMENTO

### BUG 5: "CONNECTING TO LIVE FEED..." permanece na tela
**Severidade:** ALTA | **Página:** / (Dashboard)
**Problema:** O texto "CONNECTING TO LIVE FEED..." aparece no topo do Dashboard e nunca muda para "CONNECTED". Indica que a conexão WebSocket não se estabelece.
**Impacto:** Visual de "produto em construção". Os dados carregam via polling REST, então a funcionalidade não é afetada, mas a UX é ruim.
**Correção:** Ou implementar WebSocket real, ou remover o texto "CONNECTING TO LIVE FEED..." e mostrar apenas indicadores de dados ao vivo (que já existem).

### BUG 6: Difficulty mostra "----" no Bitcoin Network panel
**Severidade:** ALTA | **Página:** / (Dashboard, painel Bitcoin Network)
**Problema:** O campo DIFFICULTY mostra "----" enquanto todos os outros campos (Hashrate, Block, Mempool, Fees) funcionam.
**Correção:** Verificar se a API /api/onchain/blocks/ retorna difficulty. Pode ser que o campo tenha nome diferente na resposta.

### BUG 7: Market — Commodities e Stocks parcialmente estáticos
**Severidade:** ALTA | **Página:** /market (Global Markets)
**Problemas:**
- AMZN ($225.00) e META ($700.00) — Change "—", Volume "0" (static fallback)
- Copper ($4.50), Crude Oil ($70.00), Natural Gas ($3.80), Platinum ($970.00), Silver ($32.50) — Change "—" (static fallback)
- Ticker bar: HG=F, AMZN, META, CL=F, NG=F, PL=F todos com 0.00%

**Impacto:** Dados parecem desatualizados/falsos para usuários que conhecem mercado.
**Correção:** O MARKET-DATA-PIPELINE-FIX.md já aborda isso (inversão de prioridade TwelveData → Yahoo). Verificar se TWELVEDATA_API_KEY está no Vercel Dashboard.

### BUG 8: Cypher AI — texto diz "Connect your ETH wallet"
**Severidade:** ALTA | **Página:** /cypher-ai
**Problema:** O DApp é Bitcoin-centric, mas a página do Cypher AI diz "Connect your ETH wallet and verify Yield Hacker Pass ownership to unlock full access."
**Impacto:** Confunde usuários — é Bitcoin ou Ethereum? Prejudica a identidade da marca.
**Correção:** Trocar para "Connect your wallet and verify YHP ownership to unlock full access" (genérico).

---

## BUGS MÉDIOS (P2) — CORRIGIR PÓS-LANÇAMENTO

### BUG 9: DYDX FUNDING mostra "--" no Trading
**Severidade:** MÉDIA | **Página:** /trading
**Problema:** O campo DYDX FUNDING na barra de informações mostra "--".
**Correção:** Verificar se a API do dYdX está configurada. Considerar remover se dYdX não faz parte do escopo.

### BUG 10: Market Heatmap com grande área vazia
**Severidade:** MÉDIA | **Página:** /market (scroll down)
**Problema:** O Market Heatmap no ticker scroll-down tem uma área escura vazia grande entre os dados e a legenda.
**Correção:** Ajustar o layout/tamanho do heatmap ou preenchê-lo com mais assets.

### BUG 11: Coinbase volume "--" na Arbitrage
**Severidade:** MÉDIA | **Página:** /arbitrage
**Problema:** A exchange Coinbase mostra volume "—" enquanto outras mostram valores normais.
**Correção:** A API da Coinbase pode não retornar volume 24h. Adicionar fallback para este campo.

### BUG 12: Cypher AI sem botão "Connect Wallet" na própria página
**Severidade:** MÉDIA | **Página:** /cypher-ai
**Problema:** A página de bloqueio do Cypher AI diz para conectar wallet mas não tem botão para fazer isso. O usuário precisa ir ao navbar.
**Correção:** Adicionar botão "Connect Wallet" abaixo do texto "REQUIRED: YIELD HACKER PASS NFT".

### BUG 13: FOMC Schedule mostra "2026" mas decisões recentes são de 2024
**Severidade:** MÉDIA | **Página:** /market (FED & FOMC panel)
**Problema:** As "Recent Decisions" mostram Dec 18 (Hold), Nov 7 (Cut 25bp), Sep 18 (Cut 50bp), Jul 30 (Hold) — todas de 2024. O "FOMC 2026 SCHEDULE" está correto com próxima reunião Mar 18.
**Correção:** Atualizar as decisões recentes com dados de 2025 (se houver). Adicionar o ano às datas.

### BUG 14: Dashboard — "TERMINAL V3.2" no header é difícil de ler
**Severidade:** BAIXA | **Página:** / (Dashboard)
**Problema:** O texto "TERMINAL V3.2" ao lado de "CYPHER" tem baixo contraste (cinza claro sobre fundo escuro).
**Correção:** Aumentar o contraste ou usar cor accent.

---

## O QUE FUNCIONA BEM

| Feature | Status | Notas |
|---------|--------|-------|
| Dashboard | Excelente | BTC price, chart, market leaders, headlines, fee estimates, mempool, fear & greed |
| Price Chart | Excelente | Multi-asset (BTC/ETH/SOL/BNB), multi-timeframe (5m-1D), dados real-time |
| Bitcoin Network | Bom | Hashrate, block, mempool, fees, congestion — funcional (exceto difficulty) |
| Market — Crypto | Excelente | 15+ coins com preços, sparklines, market cap, volume |
| Market — Forex | Excelente | 6 pares com dados real-time |
| Market — Indices | Bom | SPX, NDX, DJI, RUT com dados reais (via TwelveData/Yahoo) |
| Market — News | Excelente | 19 artigos carregando com fonte e sentiment |
| Market — FED & FOMC | Bom | Fed funds rate, próxima reunião, schedule |
| Market — DEX Volume | Excelente | Dune Analytics com 8+ protocolos |
| Market — Correlations | OK | Dados hardcoded mas visual ok |
| Market — Market Breadth | Bom | 11 advancing / 25 declining com barra |
| Market — Economic Indicators | Excelente | GDP, CPI, Unemployment, Fed Rate, M2, Consumer Conf |
| Trading | Excelente | SMC chart, order book Hyperliquid, sinais com confluência |
| Ordinals | Excelente | 15 coleções, volume, market cap, listings, owners |
| Swap | Excelente | THORChain + Jupiter + 1inch, multi-chain, clean UI |
| Portfolio | Bom | FIFO/LIFO, risk mgmt, tax report — requer wallet |
| Arbitrage | Excelente | 6 exchanges real-time, spread detection, refresh 2s |
| Hacker Yields | Bom | 5-step wizard, MetaMask detected, Phantom/Xverse |
| Settings | Excelente | Tema, notifications, security, API keys, subscription |
| 404 Page | Bom | Clean com navegação |
| Segurança (Headers) | Excelente | CSP, HSTS, XSS, CORS, Permissions-Policy |
| SEO | Bom | Title tags, OG tags presentes |
| Performance | Bom | Todas as APIs retornaram 200 em < 2s |
| Console Errors | Zero | Nenhum erro JavaScript em nenhuma página |

---

## PRIORIDADE DE CORREÇÃO

### Antes do lançamento (obrigatório):
1. **BUG 1** — Premium bypass localStorage (MAIS URGENTE — impede qualquer receita)
2. **BUG 4** — Link para Pricing na navbar
3. **BUG 2** — Miners NaN (remover ou corrigir)
4. **BUG 5** — Remover "CONNECTING TO LIVE FEED..."

### Primeiras 24h pós-lançamento:
5. **BUG 3** — Runes dados de preço
6. **BUG 6** — Difficulty no dashboard
7. **BUG 7** — Commodities/Stocks estáticos
8. **BUG 8** — Texto "ETH wallet" no Cypher AI

### Primeira semana:
9-14. Bugs médios restantes

---

## PROMPT PARA CLAUDE CODE

```
Use este relatório como contexto. Corrija os 4 bugs críticos:

1. src/contexts/PremiumContext.tsx — NUNCA confiar em localStorage como fonte de verdade.
   O isPremium deve ser false por default e só mudar para true após verificação server-side
   (Supabase subscription check ou on-chain NFT verification). O cache em localStorage
   deve ter TTL de 5 minutos e SEMPRE re-verificar quando expirado.
   REMOVER qualquer lógica que permita accessTier "super_admin" via client-side.

2. src/app/miners/page.tsx — Adicionar validação isNaN() e fallback "—" para todos
   os campos numéricos (hashrate, difficulty, block reward, decentralization %).
   Usar optional chaining e nullish coalescing em toda a página.

3. src/app/runes/page.tsx — Verificar por que floor_price, volume_24h retornam 0.
   Checar se a API de mercado do Magic Eden/UniSat mudou o formato de resposta.
   Adicionar fallback para dados de preço.

4. src/components/layout/unified-navbar.tsx — Adicionar link para /pricing na navbar
   entre os itens existentes. Usar ícone de tag/preço.
```
