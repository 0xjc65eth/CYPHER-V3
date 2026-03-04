---
name: trading-agent
description: Especialista no agente de trading autónomo do CYPHER V3 — Hyperliquid, CCXT, risk management, estratégias
version: "2.0"
tags: [trading, hyperliquid, ccxt, autonomous, risk, strategies]
---

# SKILL: Trading Agent — CYPHER V3

## Arquitetura do Agente (src/agent/)
```
agent/
├── connectors/          # Exchange connectors
│   ├── hyperliquid.ts   # Spot + Perps
│   ├── jupiter.ts       # Solana DEX
│   ├── uniswap.ts       # Ethereum DEX
│   └── ccxt.ts          # 130+ CEX via CCXT
├── consensus/           # Multi-agent voting system
│   ├── TechnicalAnalyst.ts   # TA indicators
│   ├── SentimentAnalyst.ts   # Social/news sentiment
│   ├── RiskManager.ts        # Drawdown, position limits
│   └── LLMAdvisor.ts         # AI reasoning layer
├── core/
│   ├── AgentOrchestrator.ts  # Main loop (5s interval)
│   └── AutoCompound.ts       # Yield optimization
├── risk/
│   ├── MaxDrawdown.ts        # Stop-loss automático
│   ├── LiquidationGuard.ts   # Prevent liquidação
│   └── MEVProtection.ts      # Front-run protection
└── strategies/
    ├── Scalping.ts       # SMC-based scalping
    ├── MarketMaker.ts    # Spread capture
    └── LP.ts             # Liquidity provision
```

## AgentOrchestrator — Padrão Correto
```typescript
// src/agent/core/AgentOrchestrator.ts
export class AgentOrchestrator {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private readonly INTERVAL_MS = 5000  // 5 segundos

  start() {
    if (this.isRunning) return
    this.isRunning = true

    // CRÍTICO: cleanup no React useEffect
    this.intervalId = setInterval(async () => {
      try {
        await this.runCycle()
      } catch (err) {
        console.error('[AgentOrchestrator] Cycle failed:', err)
        // NÃO re-throw — manter o agente vivo
      }
    }, this.INTERVAL_MS)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
  }

  private async runCycle() {
    // 1. Fetch market data
    // 2. Run consensus (Technical + Sentiment + Risk + LLM)
    // 3. Generate signals
    // 4. Apply risk filters
    // 5. Execute if consensus >= threshold
  }
}

// Em React component:
useEffect(() => {
  const orchestrator = new AgentOrchestrator()
  orchestrator.start()
  return () => orchestrator.stop()  // CRÍTICO: cleanup
}, [])
```

## Hyperliquid Connector
```typescript
// src/agent/connectors/hyperliquid.ts
import { Hyperliquid } from 'hyperliquid'

const hl = new Hyperliquid({
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  testnet: process.env.NODE_ENV !== 'production',
})

// Spot order
async function placeSpotOrder(coin: string, size: number, side: 'B' | 'A') {
  return hl.exchange.order({
    coin,
    is_buy: side === 'B',
    sz: size,
    limit_px: await getMidPrice(coin),
    order_type: { limit: { tif: 'Gtc' } },
    reduce_only: false,
  })
}

// Perp order com risk check
async function placePerpOrder(params: PerpOrderParams) {
  const { coin, size, leverage, side } = params

  // Risk check SEMPRE antes de executar
  const risk = await RiskManager.check({ coin, size, leverage })
  if (!risk.approved) throw new Error(`Risk rejected: ${risk.reason}`)

  return hl.exchange.order({
    coin,
    is_buy: side === 'long',
    sz: size,
    limit_px: risk.entryPrice,
    order_type: { limit: { tif: 'Gtc' } },
    reduce_only: false,
  })
}
```

## Risk Management — Regras Invioláveis
```typescript
// src/agent/risk/MaxDrawdown.ts
const RISK_RULES = {
  MAX_POSITION_SIZE_PCT: 5,    // máx 5% portfolio por trade
  MAX_DAILY_DRAWDOWN_PCT: 3,   // stop trading se perder 3% num dia
  MAX_OPEN_POSITIONS: 5,       // máx 5 posições abertas
  MIN_RISK_REWARD: 1.5,        // mínimo 1.5:1 R:R
  MAX_LEVERAGE: 10,            // máx 10x leverage
  STOP_LOSS_PCT: 2,            // stop loss automático em -2%
}

async function checkRisk(params: TradeParams): Promise<RiskDecision> {
  const portfolio = await getPortfolioValue()
  const maxSize = portfolio.totalValue * (RISK_RULES.MAX_POSITION_SIZE_PCT / 100)

  if (params.notionalValue > maxSize) {
    return { approved: false, reason: `Size ${params.notionalValue} exceeds max ${maxSize}` }
  }

  const dailyPnL = await getDailyPnL()
  if (dailyPnL < -(portfolio.totalValue * RISK_RULES.MAX_DAILY_DRAWDOWN_PCT / 100)) {
    return { approved: false, reason: 'Daily drawdown limit reached — trading halted' }
  }

  return { approved: true, entryPrice: params.price }
}
```

## Consensus System
```typescript
// Decisão por votação ponderada
interface AgentVote {
  agent: 'technical' | 'sentiment' | 'risk' | 'llm'
  signal: 'BUY' | 'SELL' | 'HOLD'
  confidence: number  // 0-100
  weight: number
}

const AGENT_WEIGHTS = {
  technical: 0.35,   // 35% — TA indicators
  sentiment: 0.20,   // 20% — social/news
  risk: 0.30,        // 30% — risk analysis (mais conservador)
  llm: 0.15,         // 15% — LLM reasoning
}

function resolveConsensus(votes: AgentVote[]): ConsensusDecision {
  const weightedScore = votes.reduce((acc, vote) => {
    const signal = vote.signal === 'BUY' ? 1 : vote.signal === 'SELL' ? -1 : 0
    return acc + signal * vote.confidence * vote.weight
  }, 0)

  if (weightedScore > 60) return { action: 'BUY', confidence: weightedScore }
  if (weightedScore < -60) return { action: 'SELL', confidence: Math.abs(weightedScore) }
  return { action: 'HOLD', confidence: 100 - Math.abs(weightedScore) }
}
```

## CCXT — Multi-Exchange
```typescript
import ccxt from 'ccxt'

// Exchange factory com configuração padronizada
function createExchange(exchangeId: string) {
  const ExchangeClass = ccxt[exchangeId as keyof typeof ccxt]
  return new ExchangeClass({
    apiKey: process.env[`${exchangeId.toUpperCase()}_API_KEY`],
    secret: process.env[`${exchangeId.toUpperCase()}_SECRET`],
    timeout: 10000,
    enableRateLimit: true,  // SEMPRE activado
  })
}

// Arbitragem multi-exchange
async function detectArbitrage(symbol: string): Promise<ArbitrageOpportunity[]> {
  const exchanges = ['binance', 'okx', 'bybit'].map(createExchange)
  const prices = await Promise.allSettled(
    exchanges.map(ex => ex.fetchTicker(symbol))
  )

  // Calcular spreads entre exchanges
  // Considerar fees (maker/taker) em cada exchange
  // Mínimo 0.3% spread líquido para ser viável
}
```

## ⚠️ AVISOS CRÍTICOS
1. **NUNCA** executar ordens reais em `NODE_ENV !== 'production'`
2. **SEMPRE** testar em Hyperliquid testnet primeiro
3. **NUNCA** armazenar private keys sem `AGENT_ENCRYPTION_KEY`
4. **SEMPRE** MEVProtection ativa em DEX trades
5. **NUNCA** desativar risk checks — mesmo em "modo de teste"
6. **AgentOrchestrator** DEVE ter cleanup no React — memory leak P0
