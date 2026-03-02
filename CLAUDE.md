# CYPHER V3 — MASTER AGENT BRIEFING
> Lido automaticamente pelo Claude Code em cada sessão.
> Branch estável: `audit-complete-v3` | Commit base: `c38e846`
> Agent Teams: ACTIVADO (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)

---

## ⚡ ARRANQUE DE SESSÃO — EXECUTAR SEMPRE PRIMEIRO

```bash
# 1. Orientação rápida
git log --oneline -10
git diff c38e846 HEAD --stat
git status

# 2. Saúde do projeto
npm run type-check 2>&1 | head -30
npm run lint 2>&1 | head -30

# 3. Verificar ambiente
node -v && npm -v
cat .env.local | grep -v "KEY\|SECRET\|TOKEN" 2>/dev/null || echo "NOTA: .env.local não encontrado"
```

---

## 🧠 IDENTIDADE DO PROJETO

| Campo | Valor |
|-------|-------|
| **Nome** | CYPHER ORDI-FUTURE-V3 |
| **Versão** | 3.0.0 |
| **Descrição** | Bloomberg Terminal-style crypto trading platform (Bitcoin, Ordinals, Runes, DeFi, AI Trading Agent) |
| **Dono** | 0xjc65eth |
| **Node.js** | 22.x |
| **Porto dev** | 4444 (WS: 8080, Metrics: 9090) |
| **URL prod** | https://cypher-v3.vercel.app |
| **Ficheiros src** | 1838 ficheiros TypeScript/TSX |

---

## 🧬 PERSONALIDADE DO AGENTE — SOUL.md

**Princípios absolutos (nunca violar):**
- **Direto e objetivo** — sem enrolação, sem explicações desnecessárias
- **Analisa antes de agir** — lê o código existente ANTES de modificar qualquer coisa
- **Minimalismo** — a menor mudança possível que resolve o problema
- **Autonomia** — não perguntar o que já pode decidir sozinho
- **Segurança** — nunca comprometer segurança por conveniência

---

## 🏗️ STACK TECNOLÓGICO COMPLETO

### Frontend & Framework
```
next@^15.3.9              → App Router, SSR/SSG/ISR
react@^18                 → React 18 com concurrent features
typescript@^5             → Strict mode
tailwindcss@^3.4.17       → Styling (Bloomberg theme)
framer-motion@^10.18.0    → Animações UI
lucide-react@^0.330.0     → Ícones
@radix-ui/react-*         → Componentes acessíveis (various)
```

### State Management & Data Fetching
```
zustand@^4.5.7              → Estado global (slices: asset, market, wallet, UI)
@tanstack/react-query@^5.80.5 → Cache e sincronização de dados
socket.io-client@^4.8.1     → WebSocket real-time
axios@^1.9.0                → HTTP client
```

### Charts & Visualização
```
lightweight-charts@^5.1.0   → TradingView-style charts (trading terminal)
recharts@^2.10.3            → Gráficos portfolio/analytics
technicalindicators@^3.1.0  → RSI, MACD, Bollinger Bands, etc.
```

### Blockchain & Wallets
```
ethers@^6.14.3              → EVM interactions
viem@^2.46.3                → Modern EVM library (type-safe)
wagmi@^2.15.6               → React hooks para EVM wallets
@solana/web3.js@^1.98.2    → Solana
@omnisat/lasereyes@^0.0.156 → Bitcoin/Ordinals wallet integration
sats-connect@^3.6.1         → Xverse wallet connector
```

### Trading & Exchange
```
ccxt@^4.5.37                → 130+ exchanges (Binance, OKX, Bybit, etc.)
hyperliquid                 → Perps trading (connector custom em agent/connectors/)
```

### AI & LLM (Multi-model)
```
openai@^5.1.0                  → GPT-4 / embeddings
@google/generative-ai@^0.24.1  → Gemini Pro (principal AI engine)
ANTHROPIC_API_KEY               → Claude (insights avançados)
GROK_API_KEY                    → xAI Grok (análise mercado)
```

### Backend & Infraestrutura
```
@supabase/supabase-js@^2.49.10 → Database + Auth + Realtime
ioredis@^5.6.1                  → Redis client (cache)
@upstash/redis@^1.36.3          → Redis serverless (Upstash)
@upstash/ratelimit@^2.0.8       → Rate limiting nas APIs
stripe@^20.4.0                  → Subscriptions (3 planos)
@stripe/stripe-js@^8.8.0        → Frontend Stripe
zod@^3.25.64                    → Validação de schemas
```

### Mobile
```
capacitor.config.ts  → Capacitor configurado para iOS/Android
```

### OpenClaw Agent Config
```
Gateway port: 18789 (loopback only)
Model: anthropic/claude-opus-4-6
Temperature: 0.3
Approval policy: ./policies/approve-all.yaml
Skills: code-writer, debugger, refactor, test-runner,
        git-ops, claude-code-bridge, researcher, carmack-mode
```

---

## 🗂️ ESTRUTURA DO PROJETO — MAPA COMPLETO

```
CYPHER-V3/
├── src/
│   ├── agent/                    # 🤖 AI Trading Agent (Hacker Yields)
│   │   ├── connectors/           # Hyperliquid, Jupiter, Uniswap, CCXT, Alpaca
│   │   ├── consensus/            # Voting: Technical, Sentiment, Risk, LLM agents
│   │   ├── core/                 # AgentOrchestrator (loop 5s), AutoCompound
│   │   ├── mcp/                  # MCP servers internos: MarketData, Risk, Trading
│   │   ├── persistence/          # Supabase persistence layer
│   │   ├── risk/                 # MaxDrawdown, LiquidationGuard, MEVProtection
│   │   ├── strategies/           # Scalping(SMC), Market-Maker, LP(Raydium/Uniswap)
│   │   └── wallet/               # SecureKeyStore, SessionKeyManager
│   │
│   ├── ai/                       # Cypher AI v2
│   │                             # NLU, Gemini, OpenAI, voice input, streaming
│   │
│   ├── app/                      # Next.js App Router (200+ API routes)
│   │   ├── page.tsx              # Landing page (pricing, CTA, FAQ)
│   │   ├── dashboard/            # Bloomberg Terminal principal
│   │   ├── api/                  # API routes: market, ordinals, runes, fees,
│   │   │                         #   agent, subscription, arbitrage, brc20, swap...
│   │   ├── arbitrage/            # Scanner de arbitragem multi-chain
│   │   ├── brc20/                # BRC-20 tokens explorer
│   │   ├── hacker-yields/        # UI do AI Trading Agent
│   │   ├── market/               # Vista global de mercado
│   │   ├── ordinals/             # Ordinals explorer + trading
│   │   ├── portfolio/            # Gestão de portfolio + P&L
│   │   ├── pricing/              # Página de subscrição Stripe
│   │   ├── runes/                # Terminal de Runes
│   │   ├── settings/             # Definições + gestão de subscrição
│   │   ├── swap/                 # Token swap interface
│   │   └── trading-agent/        # Agent setup wizard + dashboard
│   │
│   ├── components/               # 300+ componentes React (Bloomberg theme)
│   ├── contexts/                 # PremiumContext, WalletContext, ThemeContext
│   ├── hooks/                    # 50+ custom hooks
│   ├── lib/                      # Utils, APIs, middleware, database, cache, fees
│   ├── services/                 # 30+ services (analytics, ML, ordinals, runes, bot)
│   ├── store/zustand/            # Slices: asset, market, wallet, UI, etc.
│   └── types/                    # TypeScript definitions
│
├── database/                     # Schemas e migrations
├── monitoring/                   # Alertas, métricas (porta 9090)
├── policies/                     # approve-all.yaml
├── scripts/                      # Scripts de automação
├── skills/                       # Skills OpenClaw agent
├── tests/                        # unit/ integration/ e2e/
├── CLAUDE.md                     # ← Este ficheiro
├── AGENTS.md                     # Definição agente cypher-dev
├── SOUL.md                       # Princípios do agente
├── openclaw.json                 # Config OpenClaw (gateway:18789)
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── docker-compose.yml
├── Dockerfile / Dockerfile.railway
└── vercel.json / netlify.toml
```

---

## 🔌 TODAS AS INTEGRAÇÕES DE API

### Market Data
| API | Env Var | Uso |
|-----|---------|-----|
| CoinMarketCap | `CMC_API_KEY` | Preços + rankings globais |
| CoinGecko | `COINGECKO_API_KEY` | Market data geral |
| Binance | `BINANCE_API_KEY` | Trading + orderbook |
| Glassnode | `GLASSNODE_API_KEY` | On-chain analytics Bitcoin |

### Bitcoin / Ordinals / Runes
| API | Env Var | Uso |
|-----|---------|-----|
| Hiro Systems | `HIRO_API_KEY` | Bitcoin/Stacks data |
| Ordiscan | `ORDISCAN_API_KEY` | Ordinals explorer |
| UniSat | `UNISAT_API_KEY` | Inscriptions + wallet data |
| Magic Eden | `MAGIC_EDEN_API_KEY` | ⚠️ **A MIGRAR — VER ABAIXO** |

### ⚠️ ALERTA CRÍTICO — MAGIC EDEN DEPRECATION
**Magic Eden está a sair do mercado de Ordinals e Runes.**
Migração obrigatória para:
1. **OKX NFT Marketplace API** → https://docs.okx.com/web3/marketplace-api (prioridade 1)
2. **Gamma.io API** → https://gamma.io/developers (nativo Ordinals)
3. **UniSat Marketplace** → já parcialmente integrado no projeto

Substituir TODAS as chamadas `MAGIC_EDEN_API_KEY` por estas alternativas.

### Trading & DeFi
| API | Env Var | Uso |
|-----|---------|-----|
| Hyperliquid | `HYPERLIQUID_API_KEY` | Perps trading (agent/connectors/) |
| CCXT 130+ | configs individuais | Multi-exchange via ccxt library |

### Blockchain RPCs
| Chain | Env Var |
|-------|---------|
| Solana | `SOLANA_RPC_URL` |
| Ethereum | `ETH_RPC_URL` |
| Arbitrum | `NEXT_PUBLIC_ARB_RPC_URL` |
| Base | `NEXT_PUBLIC_BASE_RPC_URL` |

### AI / LLM Multi-model
| Modelo | Env Var | Uso |
|--------|---------|-----|
| Gemini Pro | `GEMINI_API_KEY` | Principal AI engine |
| GPT-4 | `OPENAI_API_KEY` | Fallback + embeddings |
| Claude | `ANTHROPIC_API_KEY` | AI insights premium |
| Grok | `GROK_API_KEY` | Análise de mercado alternativa |

### Infraestrutura
| Serviço | Env Vars | Uso |
|---------|---------|-----|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` + `SERVICE_ROLE_KEY` | DB principal + Auth + Realtime |
| Redis/Upstash | `REDIS_URL` | Cache (fallback in-memory se vazio) |
| Stripe | `STRIPE_SECRET_KEY` + `PUBLISHABLE_KEY` + `WEBHOOK_SECRET` | Subscriptions |

### Planos de Subscrição Stripe
```
STRIPE_PRICE_EXPLORER       → Plano Explorer (básico)
STRIPE_PRICE_TRADER         → Plano Trader (mid-tier)
STRIPE_PRICE_HACKER_YIELDS  → Plano Hacker Yields (AI Agent full access)
```

### Fee Protocol (Protocolo de taxas CYPHER)
```
CYPHER_FEE_EVM=        → Wallet EVM para recolha de fees
CYPHER_FEE_SOLANA=     → Wallet Solana para fees
CYPHER_FEE_BITCOIN=    → Wallet Bitcoin para fees
CYPHER_SWAP_FEE_BPS=30 → 0.30% fee em todos os swaps
```

### Auth & Security Keys
```
NEXTAUTH_SECRET=           → NextAuth
JWT_SECRET=                → JWT tokens
ADMIN_JWT_SECRET=          → Admin routes
AGENT_ENCRYPTION_KEY=      → Encriptação de dados do agente
SECURITY_ENCRYPTION_KEY=   → Encriptação de segurança geral
```

---

## 🤖 SISTEMA DE AGENTES — 6 PAPÉIS SIMULTÂNEOS

> `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` está ATIVO
> Lança sub-agentes em paralelo para máxima eficiência

---

### 🔴 AGENTE 1 — SECURITY ANALYST

**Audit obrigatório em cada sessão:**

```bash
# Secrets no frontend
grep -r "NEXT_PUBLIC_" src/ | grep -iE "secret|password|private_key"

# Audit de dependências
npm audit --audit-level=high

# Rotas sem validação zod
grep -r "req.body\|req.json()" src/app/api/ --include="*.ts" -l

# Stripe webhook - verificar assinatura
grep -r "stripe.webhooks" src/ --include="*.ts"
```

**Regras absolutas de segurança:**
- `AGENT_ENCRYPTION_KEY` e `SECURITY_ENCRYPTION_KEY` → NUNCA no frontend
- Toda a rota `/api/agent/*` e `/api/trading/*` → validação zod obrigatória + rate limit
- `SecureKeyStore` → verificar que private keys são encriptadas em repouso
- Stripe webhooks → validar `STRIPE_WEBHOOK_SECRET` antes de processar
- Supabase RLS → ativo nas tabelas users, wallets, transactions
- MEVProtection em `agent/risk/` → verificar se está ativo em produção
- Fee wallets `CYPHER_FEE_*` → nunca expor no frontend

---

### 🟣 AGENTE 2 — UX/USABILITY ANALYST

**O utilizador é um trader profissional — cada segundo conta.**

**Verificações obrigatórias:**
- Skeleton loaders em TODOS os componentes com dados assíncronos
- Timeout máximo 10s em qualquer operação → erro claro e acionável
- BTC price, P&L e alertas → sempre visíveis sem scroll no dashboard
- Optimistic updates em ações frequentes (like/watch ordinals, etc.)
- Error boundaries em todos os módulos: dashboard, ordinals, runes, agent
- Capacitor mobile → testar responsividade em 375px (iPhone SE)
- Fluxo crítico: connect wallet → select asset → trade → confirm → feedback

**Bloomberg Terminal Design System:**
```css
--orange:      #FF6B00   /* Ações, CTAs, highlights */
--background:  #000000   /* Terminal background */
--success:     #00FF00   /* Profit, positive, connected */
--danger:      #FF0000   /* Loss, error, disconnected */
--text:        #FFFFFF   /* Primary text */
--muted:       #666666   /* Secondary text, labels */
--border:      #333333   /* Dividers, borders */
--accent:      #FF8C00   /* Secondary orange */
--rare-purple: #8B5CF6   /* Rare Sats module theme */
--rare-gold:   #F59E0B   /* High-tier rare sats */
```

---

### 🟡 AGENTE 3 — BUG HUNTER

**Scan obrigatório ao iniciar sessão:**

```bash
# Mock data ativo
grep -r "mockData\|MOCK_\|isMock\|hardcoded\|TODO\|FIXME\|HACK" src/ \
  --include="*.ts" --include="*.tsx" -l | head -20

# Memory leaks potenciais
grep -rn "useEffect" src/components/ --include="*.tsx" | \
  grep -v "return\|cleanup\|unmount" | wc -l

# Promises sem catch
grep -rn "\.then(" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "\.catch\|try {" | head -10

# any injustificado
grep -rn ": any\|as any" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "// eslint" | wc -l

# Logs de debug em produção
grep -rn "console\." src/ --include="*.ts" --include="*.tsx" -l
```

**Problemas conhecidos — verificar SEMPRE:**
- [ ] **Redis** → `REDIS_URL` vazio deve usar in-memory sem errors
- [ ] **Hydration** → componentes de preço real-time (timestamps, random values)
- [ ] **AgentOrchestrator** → loop 5s tem cleanup no `useEffect`?
- [ ] **WebSocket** → reconnection com backoff exponencial implementada?
- [ ] **Race conditions** → chamadas paralelas de 50+ preços em simultâneo
- [ ] **Magic Eden** → todas as calls vão começar a falhar (deprecação)
- [ ] **CCXT** → importações globais vs tree-shaking (bundle size crítico)

---

### 🔵 AGENTE 4 — MARKET RESEARCHER

**Usar web search ANTES de propor qualquer feature nova.**

**Investigações prioritárias:**

1. **Magic Eden → OKX NFT Migration**
   - Docs: https://docs.okx.com/web3/marketplace-api
   - Endpoints equivalentes para collections, listings, offers

2. **Runes Protocol Estado Atual 2025**
   - Novos tools e indexers disponíveis
   - Volume e projetos mais relevantes

3. **Bitcoin Ordinals Mercado 2025**
   - Principais coleções por volume
   - Novos marketplaces emergentes

4. **Rare Sats Pricing Real**
   - Satributos mais valorizados no mercado
   - Fontes de dados de raridade fiáveis

5. **Hyperliquid API Updates**
   - Novos endpoints disponíveis
   - Limites de rate e boas práticas

6. **AI Trading Bots Best Practices 2025**
   - Estratégias que funcionam em mercados cripto voláteis
   - Risk management para bots autónomos

**Fontes:**
- https://docs.okx.com/web3
- https://github.com/casey/ord
- https://unisat.io/developer
- https://hiro.so/developers
- https://gamma.io/developers
- https://docs.hyperliquid.xyz

---

### 🟢 AGENTE 5 — PERFORMANCE ENGINEER

**Métricas alvo:**
```
First Load JS:  < 300KB
Build time:     < 60s
LCP:            < 2.5s
CLS:            < 0.1
API response:   < 200ms (cache hit) / < 1s (fresh)
```

**Audits obrigatórios:**
```bash
# Bundle size
npm run build 2>&1 | grep "First Load JS\|chunks"

# Dependências não usadas
npx depcheck 2>&1 | head -30

# Imports pesados não lazy
grep -r "import.*ccxt\|import.*tensorflow" src/ --include="*.ts" --include="*.tsx"
```

**Otimizações críticas:**
- `ccxt@4.5.37` → importar APENAS exchanges usados (não `import * as ccxt`)
- `@tensorflow/tfjs` → dynamic import APENAS no módulo AI
- `lightweight-charts` + `recharts` → não devem estar ambos no bundle inicial
- Zustand → todos os stores com selective subscriptions (`useStore(s => s.field)`)
- React Query → `staleTime` e `gcTime` configurados por tipo de dado:
  - Preços: `staleTime: 10_000` (10s)
  - Ordinals collections: `staleTime: 60_000` (1min)
  - Portfolio: `staleTime: 30_000` (30s)
- WebSocket → UMA conexão partilhada via Context (não criar por componente)
- Supabase Realtime → cleanup obrigatório em todos os `useEffect`
- AgentOrchestrator (5s loop) → não deve causar re-renders em cascata no UI

---

### ⚪ AGENTE 6 — CODE QUALITY GUARDIAN

**Standards obrigatórios:**
```bash
# Type check completo
npm run type-check

# Lint
npm run lint

# Testes críticos
npm test -- --testPathPattern="trading|wallet|fees|agent"
```

**Regras de qualidade:**
- TypeScript strict → zero `any` sem `// eslint-disable-next-line` justificado
- Zod schemas para TODOS os inputs externos (API responses, form data, URL params)
- Custom hooks → JSDoc com descrição, params e return type
- Componentes > 200 linhas → candidatos a refatoração
- Lógica duplicada em 2+ lugares → extrair para `src/lib/` ou `src/hooks/`
- Services em `src/services/` → interface clara, não misturar UI com lógica

**Conventional Commits obrigatório:**
```
feat(ordinals): add OKX NFT marketplace integration
fix(redis): handle empty REDIS_URL with graceful fallback
security(api): add zod validation to all agent routes
perf(bundle): lazy load TensorFlow and CCXT
refactor(runes): replace Magic Eden calls with OKX API
test(trading): add unit tests for fee calculation
```

---

## 🚨 BACKLOG PRIORIZADO

### P0 — BLOQUEIA PRODUÇÃO (resolver imediatamente)
- [ ] **Magic Eden deprecation** → migrar para OKX NFT + Gamma.io em TODOS os ficheiros
- [ ] **Hydration mismatches** → fixar componentes com timestamps/preços real-time
- [ ] **Redis fallback** → confirmar que in-memory funciona sem erros quando `REDIS_URL=`
- [ ] **Mock data em produção** → grep e eliminar em ordinals, runes, brc20, rare-sats

### P1 — IMPACTO ALTO
- [ ] Error boundaries em dashboard, ordinals, runes, hacker-yields
- [ ] AgentOrchestrator (5s loop) → cleanup no unmount (memory leak)
- [ ] WebSocket → reconnection com backoff exponencial
- [ ] Rate limiting em `/api/agent/*` e `/api/trading/*`
- [ ] Zod validation em todas as rotas `/api/`
- [ ] CCXT → tree-shaking (bundle size crítico)

### P2 — QUALIDADE
- [ ] TypeScript `any` audit → reduzir para zero
- [ ] Console.log cleanup (produção não deve ter logs de debug)
- [ ] TensorFlow → lazy load
- [ ] Testes unitários: fee calculation, wallet validation, trade execution
- [ ] React Query → configurar staleTime por tipo de dado

### P3 — MELHORIAS
- [ ] JSDoc nos 50+ custom hooks
- [ ] next-bundle-analyzer configurado
- [ ] Storybook para componentes Bloomberg
- [ ] Performance profiling detalhado

---

## 🔧 MCP SERVERS (agent/mcp/)

O projeto tem MCP servers próprios em `src/agent/mcp/`:

| MCP | Função |
|-----|--------|
| `MarketData MCP` | Dados de mercado em real-time para o agent |
| `Risk MCP` | Avaliação de risco de posições abertas |
| `Trading MCP` | Execução de ordens nos exchanges |

**OpenClaw Gateway:** `localhost:18789` (loopback only, não expor externamente)

---

## 📜 COMANDOS DE DESENVOLVIMENTO

```bash
npm run dev           # Dev server porta 4444
npm run build         # Build produção
npm run start         # Start produção
npm run lint          # ESLint check
npm run lint:fix      # Auto-fix ESLint
npm run type-check    # TypeScript strict (zero erros obrigatório)
npm run test          # Jest (todos os testes)
npm run test:unit     # Só unit tests
npm run test:integration  # Só integration
npm run test:coverage     # Com cobertura de código
npm run format        # Prettier
```

---

## 🚀 DEPLOY TARGETS

| Plataforma | Config | Notas |
|------------|--------|-------|
| Vercel | `vercel.json` | Deploy principal (prod) |
| Railway | `railway.dockerfile` | Deploy alternativo |
| Docker | `docker-compose.yml` | Self-hosted |
| Netlify | `netlify.toml` | Backup deploy |

---

## 🔒 CHECKLIST SEGURANÇA PRÉ-DEPLOY

```bash
# Vulnerabilidades críticas
npm audit --audit-level=high

# Secrets no código
grep -r "NEXT_PUBLIC_" src/ | grep -iE "secret|private|password"

# .env não commitado
git status | grep "\.env"
git log --oneline | head -5  # verificar nenhum commit com .env
```

**Gates obrigatórios:**
- [ ] `npm audit` → zero vulnerabilidades HIGH ou CRITICAL
- [ ] Todas as API keys em `.env.local` / Railway vars (nunca no código)
- [ ] `NEXT_PUBLIC_*` → apenas URLs públicas e feature flags
- [ ] Stripe webhook → validação de assinatura ativa
- [ ] Supabase RLS → ativo em todas as tabelas sensíveis
- [ ] Rate limiting ativo em endpoints de trading e agent
- [ ] Headers de segurança em `next.config.js` (CSP, HSTS, X-Frame)

---

## 🌐 ROADMAP ESTRATÉGICO

### Imediato (Sprint atual)
1. Migrar Magic Eden → OKX NFT + Gamma.io
2. Eliminar 100% mock data
3. Fix Redis + Hydration (P0)

### Curto prazo (1-2 meses)
4. AI Trading Agent (Hacker Yields) → produção estável
5. Stripe subscription flow completo
6. Mobile app via Capacitor (iOS + Android)

### Médio prazo (3-6 meses)
7. Multi-chain arbitrage simultâneo (BTC/ETH/SOL)
8. Social trading — copiar estratégias de traders
9. API pública CYPHER para terceiros

### Longo prazo (6+ meses)
10. Lightning Network integration
11. Stacks (Bitcoin L2) support
12. CYPHER DEX próprio

---

*Stack: Next.js 15 + React 18 + TypeScript 5 + Supabase + Redis + Stripe + 130+ deps*
*Dimensão: 1838 ficheiros src | 200+ API routes | 300+ componentes | 50+ hooks | 30+ services*
*Agent: claude-opus-4-6 @ temp 0.3 | OpenClaw gateway:18789 | Teams: ENABLED*
*Última atualização: 2025 | Branch: audit-complete-v3 | Commit base: c38e846*
