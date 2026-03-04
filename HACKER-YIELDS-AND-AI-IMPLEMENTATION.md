# IMPLEMENTAÇÃO: Hacker Yields Autônomo + Cypher AI Funcional

## CONTEXTO

O código já possui uma arquitetura COMPLETA para trading autônomo:
- AgentOrchestrator com main loop, consensus engine, risk management
- HyperliquidConnector (perps), JupiterConnector (Solana LP), UniswapConnector (EVM LP)
- 4 consensus agents (Technical, Risk, LLM, Sentiment) com voting
- AutoCompound engine, MEV Protection, Liquidation Guard
- 5-step wizard UI com API integration (/api/agent)
- Cypher AI com 8 agentes especializados + Gemini 2.0 Flash

## O QUE IMPEDE DE FUNCIONAR

### Problema 1: PremiumContent gate bloqueia acesso
- `PremiumContent` em `premium-content.tsx` verifica `hasFeature('ai_trading_agent')` e `requiredFeature`
- Sem wallet conectada + YHP NFT, mostra fallback (tela de bloqueio)
- O Cypher AI usa `PremiumContent` que verifica acesso premium
- Para testes e para planos Stripe, precisa funcionar via subscription (não só NFT)

### Problema 2: ENABLE_AUTO_TRADE=false por default
- `ConsensusEngine.ts` linha 151: `const autoTradeEnabled = process.env.ENABLE_AUTO_TRADE === 'true'`
- Sem esta env var, NENHUM trade é executado mesmo após consensus aprovar

### Problema 3: Gemini API Key pode não estar configurada no Vercel
- `/api/cypher-ai/chat/route.ts` retorna 503 se `GEMINI_API_KEY` está vazio

### Problema 4: A ativação do agent no wizard (Step 5) funciona MAS...
- O wizard JÁ chama `POST /api/agent` com action:'start' e credentials
- PORÉM o AgentOrchestrator.start() pode não estar inicializando os connectors corretamente com as credentials recebidas
- As credentials são armazenadas em `secureCredentials` Map no route.ts mas NÃO são passadas ao orchestrator

### Problema 5: Connectors não recebem as credentials do wizard
- O `route.ts` armazena credentials no `secureCredentials` Map
- MAS o `AgentOrchestrator` inicializa connectors no constructor com config default
- As credentials do wizard NUNCA chegam aos connectors reais

---

## AGENTE 1: Conectar Wizard → Agent API → Connectors (CRÍTICO)

### Arquivo: `src/app/api/agent/route.ts`

**PROBLEMA:** As credentials são salvas em `secureCredentials` Map mas nunca passadas ao orchestrator.

**CORREÇÃO:** No case 'start', ANTES de `orchestrator.start()`, passar as credentials:

```typescript
case 'start': {
  // 1. Store credentials securely
  if (credentials?.hyperliquid) {
    secureCredentials.set('hyperliquid', {
      agentKey: credentials.hyperliquid.agentKey,
      agentSecret: credentials.hyperliquid.agentSecret,
      testnet: credentials.hyperliquid.testnet ? 'true' : 'false',
    });
  }
  if (credentials?.solanaRpc) {
    secureCredentials.set('solana', { rpcUrl: credentials.solanaRpc });
  }
  if (credentials?.ethRpc) {
    secureCredentials.set('ethereum', { rpcUrl: credentials.ethRpc });
  }

  // 2. NOVO: Passar credentials ao orchestrator para inicializar connectors
  if (config) {
    orchestrator.updateConfig({
      ...config,
      credentials: {
        hyperliquid: secureCredentials.get('hyperliquid'),
        solana: secureCredentials.get('solana'),
        ethereum: secureCredentials.get('ethereum'),
      }
    });
  }

  // 3. Start
  await orchestrator.start();
  // ...
}
```

### Arquivo: `src/agent/core/AgentOrchestrator.ts`

**PROBLEMA:** Os connectors são inicializados no constructor com placeholders.

**CORREÇÃO:** Adicionar método `initializeConnectors(credentials)` que:
1. Cria HyperliquidConnector com agentKey/agentSecret reais
2. Cria JupiterConnector com rpcUrl real
3. Cria UniswapConnector com rpcUrl e chainId reais
4. Chama `connector.connect()` para cada um
5. Registra os connectors no Map interno

No método `start()`, verificar se connectors estão inicializados com credentials reais antes de iniciar o main loop.

```typescript
async start() {
  // Se credentials foram passadas via updateConfig, inicializar connectors
  if (this.config.credentials) {
    await this.initializeConnectors(this.config.credentials);
  }

  // Verificar que pelo menos um connector está conectado
  if (this.connectors.size === 0 || !this.connector?.isConnected()) {
    throw new Error('No exchange connectors initialized. Provide valid API credentials.');
  }

  this.isRunning = true;
  // ... start main loop
}

private async initializeConnectors(creds: any) {
  // Hyperliquid
  if (creds.hyperliquid?.agentKey) {
    const hlConfig = {
      apiUrl: creds.hyperliquid.testnet === 'true'
        ? 'https://api.hyperliquid-testnet.xyz'
        : 'https://api.hyperliquid.xyz',
      agentKey: creds.hyperliquid.agentKey,
      agentSecret: creds.hyperliquid.agentSecret,
    };
    this.connector = new HyperliquidConnector(hlConfig);
    const connected = await this.connector.connect();
    if (connected) {
      this.connectors.set('hyperliquid', this.connector);
    }
  }

  // Jupiter/Solana
  if (creds.solana?.rpcUrl) {
    const jupConfig = {
      name: 'Jupiter',
      chain: 'solana' as const,
      rpcUrl: creds.solana.rpcUrl,
    };
    const jup = new JupiterConnector(jupConfig);
    const connected = await jup.connect();
    if (connected) {
      this.connectors.set('jupiter', jup);
    }
  }

  // Uniswap/EVM
  if (creds.ethereum?.rpcUrl) {
    const uniConfig = {
      name: 'Uniswap',
      chain: 'evm' as const,
      rpcUrl: creds.ethereum.rpcUrl,
      chainId: 1, // Ethereum mainnet by default
    };
    const uni = new UniswapConnector(uniConfig);
    const connected = await uni.connect();
    if (connected) {
      this.connectors.set('uniswap', uni);
    }
  }
}
```

---

## AGENTE 2: Habilitar Auto-Trade via Config (não env var)

### Arquivo: `src/agent/consensus/ConsensusEngine.ts`

**PROBLEMA:** `ENABLE_AUTO_TRADE` é uma env var fixa. O wizard deveria controlar isso.

**CORREÇÃO:** O enableTrading config do wizard deve ser passado ao ConsensusEngine:

```typescript
// Em vez de:
const autoTradeEnabled = process.env.ENABLE_AUTO_TRADE === 'true';

// Usar:
const autoTradeEnabled = process.env.ENABLE_AUTO_TRADE === 'true'
  || this.config?.enableTrading === true;
```

O wizard já envia `enableTrading: !credentials.hlTestnet` no config (linha 1638 do page.tsx). Precisamos garantir que esse valor chega ao ConsensusEngine.

### Arquivo: `src/agent/core/AgentOrchestrator.ts`

Passar a flag `enableTrading` do config ao ConsensusEngine na inicialização:

```typescript
// No constructor ou start():
this.consensus = getConsensusEngine({ enableTrading: this.config.enableTrading });
```

---

## AGENTE 3: Cypher AI Funcional

### Arquivo: `src/app/cypher-ai/page.tsx`

**PROBLEMA:** A página usa `PremiumContent` com `requiredFeature="ai_trading_agent"` mas para o Cypher AI, deveria ser um feature diferente, pois o AI é acessível pelo tier "trader" ($79/mês), não só "hacker_yields" ($149/mês).

**CORREÇÃO 1:** Criar feature separada para Cypher AI no FEATURE_TIER_MAP:

```typescript
// src/lib/stripe/config.ts
export const FEATURE_TIER_MAP: Record<string, SubscriptionTier> = {
  // ... existing features
  cypher_ai: 'trader',        // Cypher AI acessível desde tier "trader"
  ai_trading_agent: 'hacker_yields',  // Agent autônomo só para hacker_yields
}
```

**CORREÇÃO 2:** Na página do Cypher AI, mudar o requiredFeature:

```typescript
// src/app/cypher-ai/page.tsx
<PremiumContent requiredFeature="cypher_ai" fallback={yhpFallback}>
```

**CORREÇÃO 3:** Garantir que GEMINI_API_KEY está configurada no Vercel:
- Ir ao Vercel Dashboard → Settings → Environment Variables
- Adicionar: `GEMINI_API_KEY=<sua chave Gemini>`
- Adicionar: `GEMINI_MODEL=gemini-2.0-flash`

### Arquivo: `src/app/api/cypher-ai/chat/route.ts`

Este arquivo JÁ está funcional. Ele:
1. Recebe mensagem do usuário
2. Roteia para o agente correto via keyword matching
3. Busca dados real-time (Binance, mempool, Fear&Greed, etc.)
4. Monta system prompt com dados + contexto
5. Chama Gemini 2.0 Flash API
6. Retorna resposta formatada

**Verificar:** Se o GEMINI_API_KEY está no Vercel, o chat deve funcionar imediatamente.

### Arquivo: `src/components/ai/CypherAIInterface.tsx`

Este componente JÁ contém:
- Chat UI com input e histórico de mensagens
- Seletor de agente
- Voice recording/playback
- Markdown rendering na resposta

**NÃO PRECISA DE MUDANÇAS** — o componente está completo.

---

## AGENTE 4: Subscription-based Access (alternativa ao NFT)

### Arquivo: `src/components/premium-content.tsx`

**PROBLEMA:** O gate verifica wallet + NFT ownership. Para usuários com subscription Stripe, deveria funcionar SEM NFT.

A lógica atual (linhas 29-82):
1. Se wallet disconnected E tier/feature required → LOCKED
2. Se requiredTier set E tier insuficiente → UpgradePrompt
3. Se requiredFeature set E feature não acessível → UpgradePrompt
4. Se nenhum tier/feature set E não premium → LOCKED

**CORREÇÃO:** Quando `requiredFeature` está set, verificar TAMBÉM o subscription tier via Stripe (não só wallet):

```typescript
// Alterar a lógica para NÃO bloquear se subscription tier é suficiente
const walletRequired = requiredTier !== undefined || requiredFeature !== undefined
const walletDisconnected = !connected && !ethAddress

// NOVO: Se o subscription tier do Stripe é suficiente, NÃO exigir wallet
const hasSubscriptionAccess = requiredFeature
  ? tierHasFeature(subscriptionTier, requiredFeature)
  : requiredTier
    ? tierHasAccess(subscriptionTier, requiredTier)
    : false;

// Se tem acesso via subscription, liberar mesmo sem wallet
if (hasSubscriptionAccess) {
  return (
    <div className="premium-content relative border rounded-lg border-[#8B5CF6]/30">
      {children}
    </div>
  );
}

// Se wallet disconnected E sem subscription → LOCKED
if (walletRequired && walletDisconnected && !hasSubscriptionAccess) {
  return fallback || defaultFallback
}
```

---

## AGENTE 5: Hacker Yields Dashboard Real-time

### Arquivo: `src/app/hacker-yields/page.tsx`

O dashboard (AgentDashboard component, ~linhas 900-1600) JÁ contém:
- Status do agente (running/paused/stopped)
- Posições abertas (perps + LP)
- Trade history
- Performance metrics (PnL, win rate, Sharpe ratio)
- Equity curve chart
- Risk metrics (drawdown, margin usage)
- Botões Start/Stop/Pause/Emergency Stop

**O que conectar:**
1. Polling do `/api/agent` GET para status real-time
2. Polling do `/api/agent/trades` para trade history
3. Polling do `/api/agent/lp-positions` para LP positions
4. WebSocket events do AgentEventBus para updates em tempo real

**Verificar que o dashboard já faz esses pollings** — baseado na exploração, ele já chama `/api/agent?include=trades` no useAgentStatus hook.

---

## AGENTE 6: Environment Variables no Vercel

### OBRIGATÓRIAS para Hacker Yields funcionar:
```env
ENABLE_AUTO_TRADE=true
```

### OBRIGATÓRIAS para Cypher AI funcionar:
```env
GEMINI_API_KEY=<Google AI Studio key>
GEMINI_MODEL=gemini-2.0-flash
```

### OPCIONAIS (melhoram a qualidade):
```env
XAI_API_KEY=<para LLM Consensus Agent usar Grok>
ELEVENLABS_API_KEY=<para voice features>
```

### JÁ CONFIGURADAS (provavelmente):
```env
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
ETH_RPC_URL=https://eth.llamarpc.com
```

---

## SEQUÊNCIA DE EXECUÇÃO

1. **AGENTE 1** (Crítico): Conectar wizard credentials → orchestrator → connectors
2. **AGENTE 2** (Crítico): Habilitar auto-trade via config do wizard
3. **AGENTE 3** (Crítico): Cypher AI com feature tier correto
4. **AGENTE 4** (Importante): Subscription access sem wallet obrigatória
5. **AGENTE 5** (Validação): Verificar dashboard polling
6. **AGENTE 6** (Deploy): Configurar env vars no Vercel

---

## FLUXO DO USUÁRIO FINAL (Hacker Yields)

1. Usuário vai para /hacker-yields
2. PremiumContent verifica se tem subscription "hacker_yields" ($149/mês) OU YHP NFT
3. Se autorizado, mostra SetupWizard de 5 passos:
   - **Step 1:** Conecta wallet EVM (MetaMask), Solana (Phantom), BTC (Xverse)
   - **Step 2:** Cola Hyperliquid Agent Key + Secret, Solana RPC, ETH RPC
   - **Step 3:** Define limites de risco (max position, leverage, drawdown)
   - **Step 4:** Seleciona mercados (BTC-PERP, ETH-PERP, SOL/USDC LP, etc.)
   - **Step 5:** Revisa e clica "ACTIVATE AGENT"
4. Wizard envia POST /api/agent com config + credentials
5. AgentOrchestrator inicializa connectors reais com credentials
6. Main loop inicia: a cada 5 min, gera signals → consensus → executa trades
7. Dashboard mostra posições, PnL, trades, equity curve em real-time
8. Usuário pode Pause/Stop/Emergency Stop a qualquer momento

## FLUXO DO USUÁRIO FINAL (Cypher AI)

1. Usuário vai para /cypher-ai
2. PremiumContent verifica subscription "trader" ($79/mês) OU "hacker_yields" ($149/mês)
3. Se autorizado, mostra interface de chat com 8 agentes
4. Usuário digita pergunta → agent routing → Gemini 2.0 Flash → resposta formatada
5. Dados real-time (BTC price, Fear & Greed, etc.) injetados no prompt
6. Usuário pode selecionar agente específico ou deixar auto-routing

---

## NOTAS DE SEGURANÇA

- **NON-CUSTODIAL:** O agente usa Agent Wallet Key (Hyperliquid) — só pode fazer trades, NÃO saques
- **SESSION KEYS:** Solana e EVM usam session keypairs com limites de gasto
- **CREDENTIALS:** Armazenadas in-memory no server (secureCredentials Map), NUNCA em localStorage ou process.env
- **RISK LIMITS:** MaxDrawdownProtection pode pausar ou parar o agent automaticamente
- **CONSENSUS:** 4 agentes votam, Risk Manager tem poder de VETO
- **DEDUP:** Orders de-duplicadas em janela de 30s para prevenir execução dupla
