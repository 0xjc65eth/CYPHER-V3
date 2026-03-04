# CYPHER V3 — ULTIMATE COMMAND
# Versão: 5.0 ULTIMATE | Data: 2026-03-04
# Executor: Claude Code Opus 4.6 + OpenClaw Gateway
# Produção: https://cypherordifuture.xyz
# Repo: github.com/0xjc65eth/CYPHER-V3 | Branch: audit-complete-v3
# Local: /Users/juliocesar/CYPHER-V3/

---

## ⚠️ INSTRUÇÕES PARA O CLAUDE CODE

1. LEIA este ficheiro INTEIRO antes de executar
2. Cada fase depende da anterior — NÃO saltar
3. ZERO dados mock em produção
4. ZERO API keys no código
5. TESTAR em cypherordifuture.xyz após cada deploy
6. REPORTAR progresso com ✅/❌ após cada fase

---

# ═══════════════════════════════════════════════════════════════
# PARTE I: EQUIPA DE AGENTES ESPECIALIZADOS
# ═══════════════════════════════════════════════════════════════

## A equipa que vai construir o CYPHER V3 profissional

### AGENTE 1: Chief Architect (Líder)
- Responsabilidade: Coordena todos os agentes, define prioridades, resolve conflitos
- Foco: Arquitetura, decisões técnicas, code review final
- Modelo: Claude Opus 4.6 (máxima capacidade)

### AGENTE 2: Security Sentinel
- Responsabilidade: Auditoria de segurança contínua
- Foco: API keys, rate limiting, wallet security, Stripe webhooks, XSS/CSRF
- Tarefas:
  - Scan de keys expostas no código
  - Validação de todos os inputs (Zod em cada API route)
  - Rate limiting em cada endpoint
  - Verificação de headers de segurança
  - Proteção de wallet operations
  - Stripe webhook signature validation
  - Supabase RLS (Row Level Security)

### AGENTE 3: Data Pipeline Engineer
- Responsabilidade: Garantir que TODOS os dados são reais e atuais
- Foco: APIs externas, Redis cache, fallback chains, data freshness
- Tarefas:
  - Smart Aggregator (OKX → Gamma → Hiro → UniSat → CoinGecko)
  - Redis cache com TTL inteligente (15s preços, 60s coleções, 300s estáticos)
  - Fallback em memória quando Redis indisponível
  - Eliminação completa de mock data
  - Zod schemas para validar TODAS as API responses

### AGENTE 4: UX Bloomberg Designer
- Responsabilidade: Interface profissional estilo Bloomberg Terminal
- Foco: Design system, formatação consistente, loading states, error boundaries
- Tarefas:
  - Design system com cores por módulo
  - Formatação centralizada (formatUSD, formatBTC, formatSats, formatPct)
  - Fallback "—" universal (nunca undefined/NaN/null)
  - Loading skeletons Bloomberg-style
  - Error boundaries em cada módulo
  - Responsive: desktop (terminal) + mobile (cards)

### AGENTE 5: Wallet & DeFi Specialist
- Responsabilidade: Conexão de wallets, swap, LP, trading
- Foco: LaserEyes, Xverse, UniSat, swap execution, fee routing
- Tarefas:
  - Wallet connect flow (LaserEyes: Xverse/UniSat/OYL)
  - Swap execution com fee routing para carteiras corretas
  - BTC/Ordinals/Runes swap interface
  - Portfolio real com balances on-chain

### AGENTE 6: Trading Engine Architect
- Responsabilidade: Aba Trading funcional com redirecionamento para DEX
- Foco: SMC analysis, signals, Hyperliquid/dYdX integration
- Tarefas:
  - SMC indicators (Order Blocks, FVG, Liquidity, BOS)
  - Signal generation com confidence score
  - Botão "Open Position" → redirecionar para DEX escolhida
  - Pre-fill: entry price, TP1/TP2/TP3, SL, leverage
  - DEX integration: Hyperliquid, dYdX, Perp Protocol

### AGENTE 7: AI Intelligence Officer
- Responsabilidade: CYPHER AI não é chatbot — é analista profissional
- Foco: Gemini integration, domain routing, real data context
- Tarefas:
  - Routing por domínio (ordinals/runes/trading/onchain)
  - Context injection com dados reais do aggregator
  - Respostas com dados atuais, não genéricas
  - Market analysis com SMC, on-chain metrics
  - Knowledge base com Ordinals collections, Runes protocol

### AGENTE 8: Hacker Yields Autonomous Agent
- Responsabilidade: A aba MAIS IMPORTANTE — agente autónomo de yields
- Foco: Trading MM/scalp, LP management, auto-compound
- Tarefas:
  - Market Making: abrir/fechar posições autónomas
  - Scalping: detectar oportunidades de curto prazo
  - LP Management: depositar/retirar de pools
  - Auto-compound: reinvestir yields automaticamente
  - Risk management: stop-loss, position sizing
  - Dashboard de performance com P&L real-time
  - Logs de todas as operações

### AGENTE 9: QA & Testing Commander
- Responsabilidade: Testar TUDO como utilizador real
- Foco: Cada aba, cada funcionalidade, cada edge case
- Tarefas:
  - Teste de cada aba no site de produção
  - Verificação de dados reais vs mock
  - Teste de wallet connect/disconnect
  - Teste de swap execution
  - Teste de responsividade
  - Performance audit (Lighthouse)

### AGENTE 10: DevOps & Deploy Guardian
- Responsabilidade: CI/CD, deploy, monitoring
- Foco: Vercel, git workflow, health checks, error tracking
- Tarefas:
  - Build verification (TypeScript 0 erros)
  - Deploy pipeline (git → Vercel)
  - Post-deploy health checks
  - Error monitoring setup
  - Conventional Commits enforcement

---

# ═══════════════════════════════════════════════════════════════
# PARTE II: VERIFICAÇÃO COMPLETA DA PRODUÇÃO
# ═══════════════════════════════════════════════════════════════

## Verificar cypherordifuture.xyz — TODAS as abas

### ABA 1: DASHBOARD
```
VERIFICAR:
□ BTC price visível e atualizado (não é mock)
□ Market overview com market cap, volume 24h, dominância
□ Cards de módulos com sparklines reais
□ Live feed com eventos recentes
□ Status bar com health de cada API (verde/amarelo/vermelho)
□ Responsive: desktop grid → mobile cards
□ Sem undefined, NaN, null, [object Object]
□ Loading skeleton enquanto dados carregam
□ Timestamp visível (último update)

DADOS NECESSÁRIOS:
- BTC price: OKX/CoinGecko (TTL 15s)
- Market overview: CoinGecko /api/v3/global (TTL 60s)
- Fees: mempool.space /api/v1/fees/recommended (TTL 30s)
- Block height: mempool.space /api/v1/blocks (TTL 30s)
```

### ABA 2: ORDINALS
```
VERIFICAR:
□ Top collections reais (NodeMonkes, Quantum Cats, Bitcoin Puppets)
□ Floor prices em BTC com 4+ decimais
□ Volume 24h real e variável
□ Supply e holders corretos
□ Imagens de inscriptions carregam
□ Search funcional
□ Sorting por volume/floor/supply
□ Detalhes ao clicar numa coleção
□ Sem dados mock ou placeholder

DADOS NECESSÁRIOS:
- Collections: OKX Ordinals API → Gamma.io → Hiro (TTL 60s)
- Floor prices: OKX/Gamma.io (TTL 60s)
- Inscriptions: Hiro /ordinals/v1/inscriptions (TTL 120s)
```

### ABA 3: RUNES
```
VERIFICAR:
□ Top Runes com formato WORD•WORD correto
□ Market cap = price × supply (verificável)
□ Volume 24h real
□ Holders count real
□ Preço em sats
□ Supply como string (não overflow com bigint)
□ Sorting funcional
□ Detalhes ao clicar

DADOS NECESSÁRIOS:
- Runes list: OKX Runes API → Hiro Runehook (TTL 60s)
- Rune details: OKX → Hiro (TTL 120s)
- Rune balances: OKX → Hiro (per-address)
```

### ABA 4: BRC-20
```
VERIFICAR:
□ Tokens reais: ORDI, SATS, PIZZA, MEME, etc.
□ Market cap e volume reais
□ Deploy/mint/transfer stats
□ Holder counts
□ Preço por token

DADOS NECESSÁRIOS:
- BRC-20 list: UniSat /v1/indexer/brc20/list → Hiro (TTL 120s)
- Token details: UniSat (TTL 120s)
```

### ABA 5: RARE SATS
```
VERIFICAR:
□ 25 satributes listados com descrição
□ Rarity scoring funcional
□ Scanner por wallet address
□ Categorias: Uncommon, Rare, Epic, Legendary, Mythic
□ Valor estimado por satributo
□ Cart/Alerts system

DADOS NECESSÁRIOS:
- Rare sats categories: definições estáticas OK
- Scan por address: Hiro /ordinals/v1/sats?address= (TTL 300s)
- Estimativa de valor: Ordiscan (TTL 300s)
```

### ABA 6: SWAP ⭐ FONTE DE RENDA — CRÍTICO
```
VERIFICAR:
□ Interface de swap funcional (token A → token B)
□ Token selector com lista real de tokens
□ Preço de conversão em tempo real
□ Fee display claro para o utilizador
□ TODAS as taxas vão para as carteiras corretas:
  - Platform fee → wallet da plataforma
  - Network fee → estimativa correta
□ Slippage tolerance configurável
□ Confirm transaction flow
□ Transaction status tracking
□ Receipt/hash após conclusão
□ Suporta: BTC ↔ Ordinals, BTC ↔ Runes, token swaps
□ Integração com wallet conectada (LaserEyes)

IMPLEMENTAÇÃO SWAP:
- Router: encontrar melhor rota de swap
- Fee engine: calcular fees e direcionar para carteiras corretas
- Execution: assinar e broadcast transaction
- Confirmation: tracking de confirmações on-chain

CARTEIRAS DE FEES (CONFIGURAR EM .env):
  SWAP_FEE_WALLET_BTC=bc1q...     # Carteira principal para fees BTC
  SWAP_FEE_WALLET_ORDINALS=bc1p... # Carteira para fees Ordinals
  SWAP_FEE_PERCENTAGE=1.0          # Percentagem de fee (1%)
  SWAP_MIN_FEE_SATS=1000           # Fee mínimo em sats
```

### ABA 7: TRADING ⭐ FUNCIONAL COM DEX REDIRECT
```
VERIFICAR:
□ Chart com candlesticks reais (TradingView lightweight-charts)
□ SMC indicators visíveis (Order Blocks, FVG, Liquidity)
□ Signal generation com confidence score (1-10)
□ Multi-timeframe: 1m, 5m, 15m, 1H, 4H, 1D
□ BOTÃO "Open Position" funcional:
  - Utilizador escolhe DEX: Hyperliquid ou dYdX
  - Ao clicar: abre a DEX num novo tab
  - Pre-preenche: entry price, TP1/TP2/TP3, SL
  - Se possível: usa SDK para montar a ordem
□ Risk calculator: position size baseado em capital e risco %
□ P&L estimado antes de executar

IMPLEMENTAÇÃO TRADING REDIRECT:

```typescript
// src/lib/trading/dexRouter.ts

interface TradeSetup {
  pair: string;        // "BTC-USDT"
  side: "LONG" | "SHORT";
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  leverage: number;
  positionSize: number;
}

const DEX_URLS = {
  hyperliquid: (setup: TradeSetup) => {
    const base = "https://app.hyperliquid.xyz/trade";
    const params = new URLSearchParams({
      asset: setup.pair.split("-")[0],
      side: setup.side.toLowerCase(),
      sz: setup.positionSize.toString(),
      limit: setup.entry.toString(),
      leverage: setup.leverage.toString(),
    });
    return `${base}?${params}`;
  },
  dydx: (setup: TradeSetup) => {
    const base = "https://trade.dydx.exchange/trade";
    const market = setup.pair.replace("-", "_");
    return `${base}/${market}`;
  },
  // Adicionar mais DEXes conforme necessário
};

export function openTradeOnDex(dex: "hyperliquid" | "dydx", setup: TradeSetup) {
  const url = DEX_URLS[dex](setup);
  window.open(url, "_blank", "noopener,noreferrer");

  // Log da operação para tracking
  logTradeIntent({
    dex,
    setup,
    timestamp: Date.now(),
    status: "redirected",
  });
}
```

### ABA 8: CYPHER AI ⭐ NÃO É CHATBOT — É ANALISTA
```
VERIFICAR:
□ Responde com dados REAIS e ATUAIS (não genérico)
□ Perguntar "Preço do BTC" → responde com preço real + análise
□ Perguntar "Top Ordinals" → lista coleções reais com floor prices
□ Perguntar "Análise SMC BTC" → dá entry/SL/TP com níveis reais
□ Perguntar "Fee rate atual" → dados do mempool.space
□ Perguntar "O que são Quantum Cats" → resposta detalhada e precisa
□ Routing por domínio funciona (detecta tema automaticamente)
□ Sub-abas: Chat, Analysis, Agents, Neural Learning
□ Analysis gera market briefs com dados reais
□ Agents mostra cards dos 8 agentes com status

IMPLEMENTAÇÃO CYPHER AI:
- Input: query do utilizador
- Step 1: detectDomain(query) → ordinals/runes/trading/onchain/general
- Step 2: getSystemPrompt(domain) → prompt especializado
- Step 3: injectContext(domain) → dados reais do aggregator
- Step 4: callGemini(prompt + context + query)
- Step 5: formatResponse() → com dados inline, não genérico
```

### ABA 9: HACKER YIELDS ⭐⭐⭐ A MAIS IMPORTANTE
```
VERIFICAR:
□ Dashboard do agente autónomo
□ Status: ativo/inativo com toggle
□ P&L total (real-time)
□ Operações abertas com detalhes
□ Histórico de operações fechadas
□ Auto-compound status
□ Risk parameters configuráveis
□ Logs de todas as ações

FUNCIONALIDADES HACKER YIELDS:

1. MARKET MAKING (MM)
   - Coloca orders dos dois lados (bid/ask)
   - Spread configurável
   - Volume por ordem configurável
   - Auto-ajuste baseado em volatilidade
   - Stop em caso de movimentos bruscos

2. SCALPING
   - Detecta micro-oportunidades (< 5 min)
   - Entry/exit automático
   - Baseado em: order flow, volume spike, momentum
   - Max drawdown configurável
   - Limitar a X operações por hora

3. LIQUIDITY PROVISION (LP)
   - Depositar em pools de liquidez
   - Monitorar IL (Impermanent Loss)
   - Rebalancear quando IL > threshold
   - Suporte: Uniswap V3, Curve, Thorchain
   - Dashboard com APY real

4. AUTO-COMPOUND
   - Colectar rewards automaticamente
   - Reinvestir no mesmo pool/strategy
   - Frequência configurável (1h/4h/12h/24h)
   - Tax harvesting awareness

5. RISK MANAGEMENT
   - Max position size por estratégia
   - Max drawdown total
   - Max loss diário
   - Kill switch automático
   - Notifications via Telegram

IMPLEMENTAÇÃO:
```typescript
// src/lib/hacker-yields/autonomousAgent.ts

interface AgentConfig {
  strategies: {
    marketMaking: {
      enabled: boolean;
      pairs: string[];
      spread: number;       // % spread
      orderSize: number;    // USD por ordem
      maxOrders: number;    // máx simultâneas
    };
    scalping: {
      enabled: boolean;
      pairs: string[];
      maxDrawdown: number;  // % max loss
      maxOpsPerHour: number;
      timeframe: "1m" | "5m" | "15m";
    };
    lp: {
      enabled: boolean;
      pools: Array<{
        protocol: "uniswap" | "curve" | "thorchain";
        pair: string;
        amount: number;
        maxIL: number;      // % max impermanent loss
      }>;
    };
    autoCompound: {
      enabled: boolean;
      frequency: "1h" | "4h" | "12h" | "24h";
      minRewardToCompound: number; // USD mínimo
    };
  };
  risk: {
    maxPositionSize: number;    // USD
    maxDailyLoss: number;       // USD
    maxTotalDrawdown: number;   // %
    killSwitch: boolean;        // para tudo se max loss atingido
    notifications: {
      telegram: boolean;
      telegramBotToken?: string;
      telegramChatId?: string;
    };
  };
}

class HackerYieldsAgent {
  private config: AgentConfig;
  private isRunning: boolean = false;
  private positions: Map<string, Position> = new Map();
  private pnl: PnLTracker;
  private logger: OperationLogger;

  constructor(config: AgentConfig) {
    this.config = config;
    this.pnl = new PnLTracker();
    this.logger = new OperationLogger();
  }

  async start() {
    this.isRunning = true;
    this.logger.log("AGENT_START", "Hacker Yields Agent started");

    // Iniciar cada estratégia em paralelo
    const tasks = [];

    if (this.config.strategies.marketMaking.enabled) {
      tasks.push(this.runMarketMaking());
    }
    if (this.config.strategies.scalping.enabled) {
      tasks.push(this.runScalping());
    }
    if (this.config.strategies.lp.enabled) {
      tasks.push(this.runLPManagement());
    }
    if (this.config.strategies.autoCompound.enabled) {
      tasks.push(this.runAutoCompound());
    }

    // Risk monitor corre sempre
    tasks.push(this.runRiskMonitor());

    await Promise.allSettled(tasks);
  }

  async stop() {
    this.isRunning = false;
    // Fechar TODAS as posições abertas
    for (const [id, pos] of this.positions) {
      await this.closePosition(id, "AGENT_STOP");
    }
    this.logger.log("AGENT_STOP", "All positions closed");
  }

  private async runMarketMaking() {
    const { pairs, spread, orderSize, maxOrders } = this.config.strategies.marketMaking;
    while (this.isRunning) {
      for (const pair of pairs) {
        try {
          const price = await this.getCurrentPrice(pair);
          const bidPrice = price * (1 - spread / 100);
          const askPrice = price * (1 + spread / 100);

          // Colocar bid e ask
          await this.placeOrder(pair, "BUY", bidPrice, orderSize);
          await this.placeOrder(pair, "SELL", askPrice, orderSize);

          this.logger.log("MM_ORDER", `${pair} bid=${bidPrice} ask=${askPrice}`);
        } catch (e) {
          this.logger.log("MM_ERROR", `${pair}: ${e}`);
        }
      }
      await sleep(5000); // Check cada 5 segundos
    }
  }

  private async runScalping() {
    const { pairs, maxDrawdown, maxOpsPerHour, timeframe } = this.config.strategies.scalping;
    let opsThisHour = 0;
    let hourStart = Date.now();

    while (this.isRunning) {
      // Reset contador a cada hora
      if (Date.now() - hourStart > 3600000) {
        opsThisHour = 0;
        hourStart = Date.now();
      }

      if (opsThisHour >= maxOpsPerHour) {
        await sleep(60000);
        continue;
      }

      for (const pair of pairs) {
        try {
          const signal = await this.detectScalpOpportunity(pair, timeframe);
          if (signal && signal.confidence > 7) {
            await this.executeScalp(pair, signal);
            opsThisHour++;
            this.logger.log("SCALP_ENTRY", `${pair} ${signal.side} @ ${signal.entry}`);
          }
        } catch (e) {
          this.logger.log("SCALP_ERROR", `${pair}: ${e}`);
        }
      }
      await sleep(10000);
    }
  }

  private async runLPManagement() {
    const { pools } = this.config.strategies.lp;
    while (this.isRunning) {
      for (const pool of pools) {
        try {
          const il = await this.checkImpermanentLoss(pool);
          if (il > pool.maxIL) {
            await this.rebalanceLP(pool);
            this.logger.log("LP_REBALANCE", `${pool.pair} IL=${il}%`);
          }
        } catch (e) {
          this.logger.log("LP_ERROR", `${pool.pair}: ${e}`);
        }
      }
      await sleep(300000); // Check cada 5 minutos
    }
  }

  private async runAutoCompound() {
    const { frequency, minRewardToCompound } = this.config.strategies.autoCompound;
    const intervals = { "1h": 3600000, "4h": 14400000, "12h": 43200000, "24h": 86400000 };

    while (this.isRunning) {
      try {
        const rewards = await this.collectRewards();
        if (rewards.totalUSD > minRewardToCompound) {
          await this.reinvestRewards(rewards);
          this.logger.log("COMPOUND", `Reinvested $${rewards.totalUSD}`);
        }
      } catch (e) {
        this.logger.log("COMPOUND_ERROR", String(e));
      }
      await sleep(intervals[frequency]);
    }
  }

  private async runRiskMonitor() {
    while (this.isRunning) {
      const totalPnL = this.pnl.getTotal();
      const dailyPnL = this.pnl.getDaily();

      // Kill switch
      if (this.config.risk.killSwitch) {
        if (dailyPnL < -this.config.risk.maxDailyLoss) {
          this.logger.log("KILL_SWITCH", `Daily loss $${dailyPnL} > max $${this.config.risk.maxDailyLoss}`);
          await this.stop();
          await this.notify("🚨 KILL SWITCH: Max daily loss reached");
          return;
        }
        if (totalPnL < -(this.config.risk.maxTotalDrawdown / 100) * this.getTotalCapital()) {
          this.logger.log("KILL_SWITCH", `Total drawdown exceeded`);
          await this.stop();
          await this.notify("🚨 KILL SWITCH: Max drawdown reached");
          return;
        }
      }

      // Notificar P&L a cada hora
      if (this.config.risk.notifications.telegram) {
        // Send periodic P&L update
      }

      await sleep(10000); // Monitor cada 10 segundos
    }
  }

  // Placeholder methods — implementar com ccxt/SDK específico
  private async getCurrentPrice(pair: string): Promise<number> { /* ccxt */ return 0; }
  private async placeOrder(pair: string, side: string, price: number, size: number) { /* ccxt */ }
  private async closePosition(id: string, reason: string) { /* ccxt */ }
  private async detectScalpOpportunity(pair: string, tf: string) { return null as any; }
  private async executeScalp(pair: string, signal: any) { /* execute */ }
  private async checkImpermanentLoss(pool: any): Promise<number> { return 0; }
  private async rebalanceLP(pool: any) { /* rebalance */ }
  private async collectRewards(): Promise<{ totalUSD: number }> { return { totalUSD: 0 }; }
  private async reinvestRewards(rewards: any) { /* reinvest */ }
  private async notify(msg: string) { /* telegram */ }
  private getTotalCapital(): number { return 0; }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
```

### ABA 10: CONNECT WALLET
```
VERIFICAR:
□ Botão "Connect Wallet" visível em todas as páginas
□ LaserEyes popup abre com opções: Xverse, UniSat, OYL
□ Após connect: endereço visível no header
□ BTC balance real
□ Ordinals holdings reais
□ Runes holdings reais
□ BRC-20 holdings reais
□ Disconnect funcional
□ Estado limpo após disconnect (sem dados residuais)
□ Persiste sessão (refresh não desconecta)
```

---

# ═══════════════════════════════════════════════════════════════
# PARTE III: SISTEMA DE SKILLS AUTO-GERADO
# ═══════════════════════════════════════════════════════════════

## Gerador de Skills — executa no Claude Code para criar 1000+ skills

```bash
#!/bin/bash
# generate-skills.sh — Gera skills automaticamente por categoria
# Executar: bash generate-skills.sh /Users/juliocesar/CYPHER-V3/skills

SKILLS_DIR="${1:-skills}"

# ═══ CATEGORIAS DE SKILLS ═══

# Categoria 1: MARKET DATA (50 skills)
MARKET_SKILLS=(
  "btc-price-tracker:Monitorar preço BTC em tempo real via múltiplas fontes"
  "eth-price-tracker:Monitorar preço ETH"
  "altcoin-scanner:Scan de altcoins com volume anormal"
  "volume-analyzer:Análise de volume 24h por exchange"
  "marketcap-ranker:Ranking de market cap atualizado"
  "dominance-tracker:Dominância BTC/ETH/stablecoins"
  "correlation-matrix:Correlação entre pares crypto"
  "volatility-index:Índice de volatilidade crypto"
  "fear-greed-index:Fear & Greed Index atualizado"
  "funding-rates:Funding rates de perpetuals"
  "open-interest:Open interest por exchange"
  "long-short-ratio:Ratio long/short por par"
  "liquidation-tracker:Liquidações em tempo real"
  "whale-alert:Transações grandes on-chain"
  "exchange-flows:Fluxos in/out de exchanges"
  "stablecoin-flows:Fluxo de stablecoins"
  "derivatives-volume:Volume de derivativos"
  "spot-vs-perp:Comparação spot vs perpetual"
  "orderbook-depth:Profundidade de orderbook"
  "bid-ask-spread:Spreads por exchange"
)

# Categoria 2: ORDINALS (40 skills)
ORDINALS_SKILLS=(
  "collection-tracker:Track top ordinal collections"
  "inscription-search:Busca de inscriptions por ID/content"
  "floor-price-monitor:Monitor de floor prices"
  "ordinals-volume:Volume de trading de ordinals"
  "new-inscriptions:Novas inscriptions recentes"
  "collection-analytics:Analytics por coleção"
  "ordinals-rarity:Scoring de raridade"
  "bitmap-tracker:Tracker de Bitmap inscriptions"
  "recursive-inscriptions:Inscriptions recursivas"
  "ordinals-marketplace:Listagens em marketplaces"
)

# Categoria 3: RUNES (40 skills)
RUNES_SKILLS=(
  "rune-tracker:Track top runes por market cap"
  "rune-etching-monitor:Novas etchings detectadas"
  "rune-holders:Distribuição de holders"
  "rune-transfers:Transferências recentes"
  "rune-minting:Status de minting"
  "rune-supply:Supply analysis (minted vs max)"
  "rune-price-history:Histórico de preço"
  "rune-volume-24h:Volume 24h por rune"
  "rune-top-holders:Top holders por rune"
  "rune-new-listings:Novas listagens"
)

# Categoria 4: TRADING (80 skills)
TRADING_SKILLS=(
  "smc-order-blocks:Detectar Order Blocks"
  "smc-fvg:Detectar Fair Value Gaps"
  "smc-liquidity:Mapear zonas de liquidez"
  "smc-bos:Break of Structure detection"
  "smc-choch:Change of Character detection"
  "smc-supply-demand:Zonas de supply/demand"
  "smc-imbalance:Imbalances no preço"
  "ema-crossover:EMA crossover signals"
  "rsi-divergence:RSI divergence detection"
  "macd-signal:MACD signal generation"
  "bollinger-squeeze:Bollinger Bands squeeze"
  "fibonacci-levels:Fibonacci retracement/extension"
  "pivot-points:Pivot points calculation"
  "vwap-analysis:VWAP analysis"
  "ichimoku-cloud:Ichimoku cloud signals"
  "multi-timeframe-analysis:Confluência multi-timeframe"
  "position-sizer:Cálculo de position size"
  "risk-reward-calc:Calculadora risk/reward"
  "trailing-stop:Trailing stop calculator"
  "entry-optimizer:Optimizar entry price"
)

# Categoria 5: DEFI (60 skills)
DEFI_SKILLS=(
  "lp-calculator:Calcular IL e APY de LP"
  "yield-optimizer:Encontrar melhores yields"
  "pool-scanner:Scan de pools por TVL/APY"
  "auto-compound-calc:Calcular benefício de auto-compound"
  "impermanent-loss:Calcular IL em tempo real"
  "protocol-tvl:TVL por protocolo"
  "lending-rates:Taxas de lending/borrowing"
  "flash-loan-detector:Detectar flash loans"
  "dex-aggregator:Encontrar melhor rota de swap"
  "bridge-comparator:Comparar bridges cross-chain"
  "staking-rewards:Calcular staking rewards"
  "governance-tracker:Track propostas de governance"
)

# Categoria 6: SECURITY (50 skills)
SECURITY_SKILLS=(
  "api-key-scanner:Scan de API keys expostas no código"
  "rate-limit-enforcer:Implementar rate limiting"
  "input-sanitizer:Sanitizar inputs"
  "xss-prevention:Prevenir XSS"
  "csrf-protection:Proteção CSRF"
  "cors-config:Configurar CORS corretamente"
  "csp-headers:Content Security Policy"
  "wallet-security:Segurança de wallet operations"
  "webhook-validator:Validar webhooks (Stripe etc)"
  "env-auditor:Auditar variáveis de ambiente"
  "dependency-scanner:Scan de vulnerabilidades em deps"
  "sql-injection:Prevenir SQL injection"
  "auth-validator:Validar autenticação"
  "session-manager:Gestão segura de sessões"
  "encryption-service:Encriptação de dados sensíveis"
)

# Categoria 7: ON-CHAIN ANALYTICS (40 skills)
ONCHAIN_SKILLS=(
  "nvt-ratio:Network Value to Transactions ratio"
  "mvrv-z-score:MVRV Z-Score calculation"
  "sopr-indicator:Spent Output Profit Ratio"
  "puell-multiple:Puell Multiple calculation"
  "stock-to-flow:Stock-to-Flow model"
  "realized-price:Realized price calculation"
  "utxo-age:UTXO age distribution"
  "hash-rate:Hash rate monitoring"
  "difficulty-adj:Difficulty adjustment tracker"
  "mempool-monitor:Mempool size and fees"
  "block-explorer:Block details explorer"
  "mining-profitability:Mining profitability calc"
  "halving-countdown:Halving countdown timer"
  "address-balance:Balance checker por address"
  "tx-tracker:Transaction tracking"
)

# Categoria 8: PERFORMANCE (30 skills)
PERF_SKILLS=(
  "bundle-analyzer:Analisar bundle size"
  "lighthouse-audit:Lighthouse performance audit"
  "api-latency:Medir latência de APIs"
  "memory-profiler:Profiling de memória"
  "render-profiler:React render profiling"
  "cache-hit-rate:Taxa de cache hits Redis"
  "db-query-optimizer:Optimizar queries Supabase"
  "image-optimizer:Optimizar imagens"
  "code-splitting:Code splitting analysis"
  "lazy-loading:Lazy loading de componentes"
)

# Categoria 9: UX (40 skills)
UX_SKILLS=(
  "bloomberg-layout:Layout estilo Bloomberg Terminal"
  "dark-theme:Dark theme consistente"
  "loading-skeleton:Skeleton loading components"
  "error-boundary:Error boundary por módulo"
  "toast-notification:Sistema de notificações"
  "keyboard-shortcuts:Atalhos de teclado"
  "search-command:Command palette (Cmd+K)"
  "responsive-grid:Grid responsivo"
  "data-table:Tabela de dados profissional"
  "sparkline-chart:Mini charts (sparklines)"
  "candlestick-chart:Candlestick chart component"
  "color-system:Design system de cores"
  "typography-system:Sistema tipográfico"
  "animation-system:Animações e transições"
  "empty-state:Estados vazios com contexto"
)

# Categoria 10: TESTING (30 skills)
TEST_SKILLS=(
  "api-endpoint-tester:Testar endpoints com curl"
  "real-data-validator:Validar dados são reais"
  "mock-data-scanner:Scan de mock data residual"
  "visual-regression:Teste de regressão visual"
  "e2e-wallet-test:Teste E2E de wallet connect"
  "e2e-swap-test:Teste E2E de swap"
  "performance-benchmark:Benchmark de performance"
  "accessibility-audit:Auditoria de acessibilidade"
  "cross-browser-test:Teste cross-browser"
  "mobile-test:Teste mobile responsive"
)

# Gerar TODAS as skills
echo "🔧 Gerando skills..."
TOTAL=0

for category_var in MARKET_SKILLS ORDINALS_SKILLS RUNES_SKILLS TRADING_SKILLS DEFI_SKILLS SECURITY_SKILLS ONCHAIN_SKILLS PERF_SKILLS UX_SKILLS TEST_SKILLS; do
  eval "skills=(\"\${${category_var}[@]}\")"
  category=$(echo "$category_var" | sed 's/_SKILLS//' | tr '[:upper:]' '[:lower:]')

  for entry in "${skills[@]}"; do
    name="${entry%%:*}"
    desc="${entry#*:}"
    dir="$SKILLS_DIR/$name"
    mkdir -p "$dir"

    cat > "$dir/SKILL.md" << SKILLEOF
---
name: $name
description: $desc
version: "1.0"
tags: [$category, cypher-v3, auto-generated]
category: $category
---

# SKILL: $name

## Descrição
$desc

## Protocolo
1. Analisar o contexto atual do CYPHER V3
2. Implementar a funcionalidade descrita
3. Testar com dados reais
4. Commit com conventional commits

## Regras
- ZERO mock data
- SEMPRE Zod validation
- SEMPRE error handling
- SEMPRE Redis cache para dados externos
- SEMPRE fallback "—" para dados indisponíveis
SKILLEOF

    ((TOTAL++))
  done
done

echo "✅ $TOTAL skills geradas em $SKILLS_DIR"
```

### Para gerar as skills, executar no Claude Code:
```bash
cd /Users/juliocesar/CYPHER-V3
bash ~/Downloads/CYPHER_V3_ULTIMATE_COMMAND.md  # Extrair o script acima
# Ou copiar o bloco de bash e executar
```

---

# ═══════════════════════════════════════════════════════════════
# PARTE IV: WORKFLOW DE EXECUÇÃO
# ═══════════════════════════════════════════════════════════════

## Ordem de Execução (Terminal 1: Claude Code)

### FASE 1: Diagnóstico (5 min)
```
/arranque
```
Resultado esperado: mapa completo do estado atual

### FASE 2: Segurança (10 min)
```
/seguranca
```
- Remover keys expostas
- Rate limiting
- Security headers
- Zod em cada API route

### FASE 3: Data Pipeline (20 min)
```
/pipeline
```
- Smart Aggregator operacional
- Todas APIs com fallback
- Redis cache em tudo
- ZERO mock data

### FASE 4: UX Bloomberg (20 min)
```
/melhora
/profissional
```
- Formatação centralizada
- Loading skeletons
- Error boundaries
- Responsive

### FASE 5: Swap & Fees (30 min)
```
Implementar swap completo com fee routing
Testar que fees vão para carteiras corretas
```

### FASE 6: Trading + DEX (20 min)
```
SMC indicators funcionais
Botão "Open Position" → redirect para Hyperliquid/dYdX
Pre-fill de trade setup
```

### FASE 7: CYPHER AI (15 min)
```
Gemini integration
Domain routing
Context injection com dados reais
Não é chatbot — é analista
```

### FASE 8: Hacker Yields (30 min)
```
Dashboard do agente autónomo
MM + Scalping + LP + Auto-compound
Risk management com kill switch
Logs de operações
```

### FASE 9: Wallet Connect (10 min)
```
LaserEyes: Xverse/UniSat/OYL
Real balances: BTC + Ordinals + Runes + BRC-20
Portfolio com valor total
```

### FASE 10: QA Final (20 min)
```
/qa
Testar CADA aba na produção (cypherordifuture.xyz)
Verificar dados reais
Verificar wallet connect
Verificar swap
Performance audit
```

### FASE 11: Deploy (10 min)
```
/deploy
Build sem erros
Git commit
Deploy para produção
Health check em cypherordifuture.xyz
```

---

# ═══════════════════════════════════════════════════════════════
# PARTE V: CHECKLIST FINAL DE PRODUÇÃO
# ═══════════════════════════════════════════════════════════════

## Verificação em cypherordifuture.xyz

```
DASHBOARD
□ BTC price real e atualizado
□ Market overview com dados reais
□ Cards com sparklines
□ Sem undefined/NaN/null
□ Loading skeleton funcional

ORDINALS
□ Coleções reais (NodeMonkes, Quantum Cats, etc.)
□ Floor prices em BTC reais
□ Imagens carregam
□ Sorting funciona

RUNES
□ Top runes com WORD•WORD
□ Market cap calculável
□ Volume real
□ Detalhes ao clicar

BRC-20
□ ORDI, SATS, etc. com preços reais
□ Market cap e volume

RARE SATS
□ 25 satributes
□ Scanner por wallet
□ Rarity scoring

SWAP ⭐
□ Interface funcional
□ Preço de conversão real
□ Fees visíveis
□ Fees vão para carteiras CORRETAS
□ Transaction tracking

TRADING ⭐
□ Chart com candles reais
□ SMC indicators visíveis
□ Signals com score
□ Botão → abre DEX com setup pre-filled

CYPHER AI ⭐
□ Responde com dados REAIS
□ Routing por domínio funciona
□ Não é genérico/chatbot

HACKER YIELDS ⭐⭐⭐
□ Dashboard do agente
□ Status ativo/inativo
□ P&L real-time
□ Operações abertas
□ Histórico
□ Risk parameters

WALLET
□ Connect funciona (Xverse/UniSat/OYL)
□ Balance real
□ Holdings reais
□ Disconnect limpo

GERAL
□ Sem erros no console
□ Performance < 3s load
□ Responsive mobile
□ HTTPS em produção
□ Headers de segurança
```

---

# ═══════════════════════════════════════════════════════════════
# REGRAS ABSOLUTAS — NUNCA VIOLAR
# ═══════════════════════════════════════════════════════════════

1. ZERO mock data em produção
2. ZERO API keys no código (tudo via process.env)
3. ZERO console.log em produção (só console.error/warn)
4. ZERO undefined/NaN/null visíveis na UI
5. SEMPRE Zod em todas as API routes
6. SEMPRE cleanup em useEffect
7. SEMPRE error boundary em cada módulo
8. SEMPRE fallback "—" quando dado indisponível
9. SEMPRE timeout em fetches externos (8s max)
10. SEMPRE Redis cache em APIs externas
11. SEMPRE fee routing para carteiras corretas no swap
12. SEMPRE redirect funcional para DEX no trading
13. SEMPRE dados reais no CYPHER AI (não genérico)
14. SEMPRE risk management no Hacker Yields
15. COMMITS com Conventional Commits

---

**Tempo total estimado: ~4-5 horas**
**Resultado: CYPHER V3 PROFISSIONAL com TODAS as abas funcionais, dados reais, agente autónomo, swap com fees corretas, trading com DEX redirect**
