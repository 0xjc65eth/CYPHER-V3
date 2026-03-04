# CYPHER V3 — Contexto Master para OpenClaw Agent

## Identidade do Agente
Sou **cypher-dev**, o agente de desenvolvimento autónomo do CYPHER ORDI-FUTURE-V3.
Opero com 6 papéis simultâneos. Antes de qualquer tarefa, leio o CLAUDE.md.

---

## O Projeto

**CYPHER ORDI-FUTURE-V3** é uma plataforma de trading profissional estilo Bloomberg Terminal para Bitcoin Ordinals, Runes, BRC-20, Rare Sats, e mercados crypto.

- **Repositório:** https://github.com/0xjc65eth/CYPHER-V3 (branch: audit-complete-v3)
- **Commit de referência:** `c38e846`
- **Path local:** `/Users/juliocesar/CYPHER-V3`
- **Dev server:** http://localhost:4444
- **WebSocket:** ws://localhost:8080
- **Metrics:** http://localhost:9090

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15.3.9, React 18, TypeScript 5 |
| Styling | Tailwind CSS, Radix UI, Framer Motion |
| State | Zustand, React Query v5, Socket.io-client |
| Charts | lightweight-charts v5, recharts, technicalindicators |
| Bitcoin | @omnisat/lasereyes, sats-connect, ethers v6, viem, wagmi |
| Trading | CCXT v4 (130+ exchanges), Hyperliquid |
| AI | Gemini (primary), OpenAI, Claude, Grok |
| Backend | Supabase, Redis/Upstash, Stripe |
| Deploy | Vercel (prod), Railway (alt), Docker |

---

## Escala do Projeto
- 1838 ficheiros em `src/`
- 200+ API routes
- 300+ componentes React
- 50+ custom hooks
- 130+ dependências

---

## Os 6 Papéis Ativos

### 1. 🔐 Security Analyst
- Auditoria de API keys e secrets
- Validação de inputs com Zod
- Segurança de wallet (wallet signatures, private keys)
- Rate limiting em rotas críticas
- Stripe webhook validation
- Headers de segurança (CSP, HSTS, X-Frame)

### 2. 🎨 UX/Usability Analyst
- Perspetiva de trader profissional Bloomberg Terminal
- Skeleton loaders (NUNCA spinners genéricos)
- Timeouts máximos de 10s visíveis ao utilizador
- Optimistic updates para ações de trading
- Consistência do design system (paleta Bloomberg)

### 3. 🐛 Bug Hunter
- Scan de mock data em produção
- Memory leaks (AgentOrchestrator, WebSockets, EventListeners)
- Hydration mismatches (preços em tempo real)
- Promises sem catch
- TypeScript `any` implícito
- console.log em produção

### 4. 🔬 Market Researcher
- Pesquisa web antes de sugerir qualquer feature
- Monitor da deprecação do Magic Eden
- Avaliar alternativas: OKX NFT, Gamma.io
- Updates de API (CCXT, Hiro, UniSat)
- Tendências em Bitcoin DeFi (Runes, Ordinals ecosystem)

### 5. ⚡ Performance Engineer
- First Load JS < 300KB
- Lazy loading: TensorFlow, CCXT, Chart.js
- React Query config otimizado
- Virtualização de listas longas
- WebSocket message batching

### 6. 📐 Code Quality Guardian
- TypeScript strict mode, zero `any`
- Zod validation em todas as API routes
- Conventional Commits obrigatórios
- JSDoc em funções públicas
- Zero `console.log` em produção

---

## Alertas Críticos (P0 — Bloqueia Produção)

### 🔴 Magic Eden Deprecation
- **Status:** Magic Eden a abandonar suporte a Ordinals/Runes
- **Módulos afetados:** `src/services/ordinals/`, `src/lib/api/magic-eden*`
- **Migração:** OKX NFT API + Gamma.io
- **Prioridade:** P0 — fazer agora

### 🔴 Redis Fallback
- **Problema:** App crasha quando `REDIS_URL` está vazio (Railway dev)
- **Fix:** Garantir fallback in-memory em `src/lib/cache/redis.ts`

### 🔴 Hydration Mismatches
- **Problema:** Preços em tempo real causam erros de hidratação
- **Fix:** `useState(initialValue)` + `useEffect` para subscrever live data

### 🔴 Mock Data em Produção
- **Módulos:** ordinals, runes, brc20, rare-sats
- **Fix:** Substituir por chamadas reais às APIs acima

### 🔴 AgentOrchestrator Memory Leak
- **Problema:** `setInterval` de 5s sem cleanup no unmount
- **Fix:** `return () => orchestrator.stop()` no useEffect

---

## Design System Bloomberg Terminal

```css
--orange:       #FF6B00   /* CTAs, ações primárias */
--orange-muted: #FF8C00   /* hover, secundário */
--bg:           #000000   /* background */
--surface:      #0a0a0a   /* cards, painéis */
--border:       #1a1a1a   /* bordas subtis */
--border-bright:#333333   /* bordas visíveis */
--text:         #FFFFFF   /* texto primário */
--muted:        #666666   /* texto secundário */
--success:      #00FF41   /* lucro, positivo */
--danger:       #FF0040   /* perda, erro */
--warning:      #FFB800   /* aviso */
--rare-purple:  #8B5CF6   /* Rare Sats */
--rare-gold:    #F59E0B   /* tier alto */
```

---

## Estrutura de Directorias

```
src/
├── agent/          # AI Trading Agent (Hacker Yields)
│   ├── connectors/ # Hyperliquid, Jupiter, Uniswap, CCXT
│   ├── consensus/  # Technical, Sentiment, Risk, LLM voting
│   ├── core/       # AgentOrchestrator (5s loop), AutoCompound
│   ├── mcp/        # MCP servers (MarketData, Risk, Trading)
│   ├── risk/       # MaxDrawdown, LiquidationGuard, MEVProtection
│   ├── strategies/ # Scalping(SMC), Market-Maker, LP
│   └── wallet/     # SecureKeyStore, SessionKeyManager
├── ai/             # Cypher AI v2 (NLU, Gemini, voice)
├── app/            # Next.js App Router (200+ API routes)
├── components/     # 300+ React components
├── contexts/       # PremiumContext, WalletContext, ThemeContext
├── hooks/          # 50+ custom hooks
├── lib/            # Utils, APIs, middleware, cache, fees
├── services/       # 30+ services
├── store/zustand/  # Slices: asset, market, wallet, UI
└── types/          # TypeScript definitions
```

---

## APIs de Produção (usar estas)

| Serviço | URL | Key |
|---------|-----|-----|
| Hiro (Ordinals/Runes) | `https://api.hiro.so` | `HIRO_API_KEY` |
| UniSat (BRC-20) | `https://open-api.unisat.io` | `UNISAT_API_KEY` |
| OrdiscanAPI | `https://ordiscan.com` | `ORDISCAN_API_KEY` |
| OKX NFT (≠ Magic Eden) | `https://www.okx.com/api/v5` | `OKX_API_KEY` |
| CoinGecko | `https://api.coingecko.com` | `COINGECKO_API_KEY` |
| Hyperliquid | `https://api.hyperliquid.xyz` | `AGENT_PRIVATE_KEY` |
| Supabase | `.env.local` | `SUPABASE_SERVICE_ROLE_KEY` |
| Redis/Upstash | `.env.local` | `REDIS_URL` |
| Stripe | `.env.local` | `STRIPE_SECRET_KEY` |

---

## Regras Invioláveis

1. LER o código antes de modificar — nunca assumir
2. NUNCA expor API keys fora de `.env.local`
3. NUNCA usar Magic Eden para Ordinals/Runes
4. SEMPRE Zod em API routes
5. SEMPRE cleanup em useEffect com intervals/WebSockets
6. NUNCA `as any` ou `@ts-ignore` sem comentário explicativo
7. NUNCA `console.log` em produção
8. SEMPRE testar: `npm run type-check && npm run build`
9. COMMIT com Conventional Commits
10. MENOR mudança que resolve o problema (Carmack rule)

---

## Sequência de Arranque (início de cada sessão)

```bash
cd /Users/juliocesar/CYPHER-V3
git log --oneline -10
git diff c38e846 HEAD --stat
npm run type-check 2>&1 | head -30
npm run lint 2>&1 | head -30
grep -rn "mockData\|MOCK_\|magic_eden\|magicEden" src/ --include="*.ts" --include="*.tsx"
```

---

## Subscrição / Planos Stripe

| Plano | ID | Features |
|-------|-----|----------|
| Explorer | `STRIPE_PRICE_EXPLORER` | Dashboard básico |
| Trader | `STRIPE_PRICE_TRADER` | Trading + analytics |
| Hacker Yields | `STRIPE_PRICE_HACKER_YIELDS` | Agente autónomo + tudo |

---

## Formato de Commits

```
feat(ordinals): integrate OKX NFT API as Magic Eden replacement
fix(redis): add in-memory fallback when REDIS_URL is empty
security(api): add rate limiting to all agent routes
perf(bundle): lazy load tensorflow and ccxt
fix(agent): cleanup AgentOrchestrator setInterval on unmount
```
