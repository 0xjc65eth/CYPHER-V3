# CYPHER ORDi FUTURE V3 — DEPLOY MASTER PROMPT

> **Objetivo:** Configurar TODAS as env vars no Vercel, testar o fluxo completo, garantir que as wallets VIP/YHP/Admin tenham acesso total, e que quem NÃO tiver pague via Stripe para acessar.

---

## CONTEXTO DO PROJETO

Este é um Bloomberg-style Bitcoin Trading Terminal (DApp) deployado em:
- **Site:** https://cypherordifuture.xyz
- **Vercel Project:** cypher-v3
- **Stack:** Next.js 14 + TypeScript + Tailwind + Stripe + Supabase + LaserEyes (BTC) + wagmi (EVM)

---

## PARTE 1: CONFIGURAR ENV VARS NO VERCEL

### 1.1 — Verificar quais env vars JÁ estão no Vercel

```bash
vercel env ls
```

### 1.2 — Env vars OBRIGATÓRIAS (copiar do .env local para o Vercel)

Execute para cada variável abaixo. Se já existir, atualize. Se não existir, crie:

```bash
# === STRIPE (RECEITA — P0) ===
vercel env add STRIPE_SECRET_KEY production        # sk_live_51S5R...
vercel env add STRIPE_WEBHOOK_SECRET production    # whsec_BIJ...
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production  # pk_live_51S5R...
vercel env add STRIPE_PRICE_EXPLORER production    # price_1T5LozFaMYusyYVbRFW9lFQE
vercel env add STRIPE_PRICE_TRADER production      # price_1T5LqSFaMYusyYVbUDApUlpt
vercel env add STRIPE_PRICE_HACKER_YIELDS production  # price_1T5LrGFaMYusyYVbgliuNmV9

# === SUPABASE (DATABASE) ===
vercel env add NEXT_PUBLIC_SUPABASE_URL production  # https://vvwkimopevmftdavefke.supabase.co
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production  # sb_publishable_...
vercel env add SUPABASE_SERVICE_ROLE_KEY production  # eyJhbGc... (JWT)

# === AUTH SECRETS ===
vercel env add NEXTAUTH_SECRET production    # 72e9ecd...
vercel env add NEXTAUTH_URL production       # https://cypherordifuture.xyz
vercel env add JWT_SECRET production         # 18f105f...
vercel env add ADMIN_JWT_SECRET production   # 8ce591f...
vercel env add AGENT_ENCRYPTION_KEY production  # 5717a1...
vercel env add SECURITY_ENCRYPTION_KEY production  # 5717a1...

# === AI / LLM ===
vercel env add GEMINI_API_KEY production     # AIzaSyA...
vercel env add GEMINI_MODEL production       # gemini-2.0-flash
vercel env add GROK_API_KEY production       # xai-i9c5...
vercel env add GROK_API_URL production       # https://api.x.ai/v1
vercel env add GROK_MODEL production         # grok-4-latest
vercel env add XAI_API_KEY production        # xai-i9c5...
vercel env add XAI_API_URL production        # https://api.x.ai/v1/chat/completions
vercel env add CONSENSUS_LLM_MODEL production  # grok-3-mini
vercel env add CONSENSUS_MIN_CONFIDENCE production  # 0.65

# === MARKET DATA APIs ===
vercel env add CMC_API_KEY production        # c045d2a9-...
vercel env add HIRO_API_KEY production       # 3100ea7...
vercel env add HIRO_API_URL production       # https://api.hiro.so
vercel env add ORDISCAN_API_KEY production   # e227a76...
vercel env add ORDISCAN_API_URL production   # https://api.ordiscan.com
vercel env add UNISAT_API_KEY production     # a569bf8...
vercel env add UNISAT_API_URL production     # https://open-api.unisat.io
vercel env add MAGIC_EDEN_API_KEY production # 1d92043...
vercel env add MAGIC_EDEN_API_URL production # https://api-mainnet.magiceden.dev
vercel env add MEMPOOL_API_URL production    # https://mempool.space/api
vercel env add TWELVEDATA_API_KEY production # 9f75115...
vercel env add NEWSAPI_KEY production        # 2ad0313...
vercel env add DUNE_API_KEY production       # 0ms5z3u...
vercel env add ELEVENLABS_API_KEY production # sk_9c2c...
vercel env add ELEVENLABS_API_URL production # https://api.elevenlabs.io

# === BLOCKCHAIN RPCs ===
vercel env add SOLANA_RPC_URL production     # https://api.mainnet-beta.solana.com
vercel env add ETH_RPC_URL production        # https://eth.llamarpc.com
vercel env add ETH_CHAIN_ID production       # 1

# === PUBLIC VARS (client-side) ===
vercel env add NEXT_PUBLIC_SITE_URL production       # https://cypherordifuture.xyz
vercel env add NEXT_PUBLIC_APP_URL production         # https://cypherordifuture.xyz
vercel env add NEXT_PUBLIC_BITCOIN_NETWORK production # mainnet
vercel env add NEXT_PUBLIC_BUILD_VERSION production   # 0.014
vercel env add NEXT_PUBLIC_ENABLE_TRADING production  # true
vercel env add NEXT_PUBLIC_ENABLE_AI_FEATURES production # true
vercel env add NEXT_PUBLIC_ENABLE_TESTNET production  # false
vercel env add NEXT_PUBLIC_DEBUG_MODE production      # false
vercel env add NEXT_PUBLIC_ENABLE_DEV_TOOLS production # false
vercel env add NEXT_PUBLIC_CACHE_ENABLED production   # true

# === PUBLIC RPCs ===
vercel env add NEXT_PUBLIC_SOLANA_RPC_URL production  # https://api.mainnet-beta.solana.com
vercel env add NEXT_PUBLIC_ETH_RPC_URL production     # https://eth.llamarpc.com
vercel env add NEXT_PUBLIC_ARB_RPC_URL production     # https://arb1.arbitrum.io/rpc
vercel env add NEXT_PUBLIC_OP_RPC_URL production      # https://mainnet.optimism.io
vercel env add NEXT_PUBLIC_POLYGON_RPC_URL production # https://polygon-rpc.com
vercel env add NEXT_PUBLIC_BASE_RPC_URL production    # https://mainnet.base.org
vercel env add NEXT_PUBLIC_AVAX_RPC_URL production    # https://api.avax.network/ext/bc/C/rpc
vercel env add NEXT_PUBLIC_BSC_RPC_URL production     # https://bsc-dataseed.binance.org

# === PUBLIC APIs ===
vercel env add NEXT_PUBLIC_HIRO_API_URL production    # https://api.hiro.so
vercel env add NEXT_PUBLIC_HIRO_ENDPOINT production   # https://api.hiro.so
vercel env add NEXT_PUBLIC_HIRO_API_ENDPOINT production # https://api.hiro.so
vercel env add NEXT_PUBLIC_HIRO_WS_ENDPOINT production # wss://api.hiro.so
vercel env add NEXT_PUBLIC_HIRO_API_TIMEOUT production # 30000
vercel env add NEXT_PUBLIC_ORDISCAN_API_URL production # https://api.ordiscan.com
vercel env add NEXT_PUBLIC_UNISAT_API_URL production  # https://open-api.unisat.io
vercel env add NEXT_PUBLIC_UNISAT_ENDPOINT production # https://open-api.unisat.io
vercel env add NEXT_PUBLIC_MAGIC_EDEN_API_URL production # https://api-mainnet.magiceden.dev
vercel env add NEXT_PUBLIC_MEMPOOL_API production     # https://mempool.space/api
vercel env add NEXT_PUBLIC_COINGECKO_API production   # https://api.coingecko.com/api/v3

# === FEE COLLECTION ===
vercel env add CYPHER_FEE_EVM production         # 0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3
vercel env add CYPHER_FEE_SOLANA production       # 4boXQgNGuKEvEzVN3vjDHC6j4RsSPyMFAadUhBg7JCwRH
vercel env add CYPHER_FEE_BITCOIN production      # 358ecZEdxH6jEQCVBjE4DcDq4qWHn1WWgGFb
vercel env add CYPHER_SWAP_FEE_BPS production     # 30
vercel env add FEE_RECIPIENT_ADDRESS production   # 0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3
vercel env add NEXT_PUBLIC_FEE_COLLECTOR_ETH production    # 0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3
vercel env add NEXT_PUBLIC_FEE_COLLECTOR_ARB production    # 0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3
vercel env add NEXT_PUBLIC_FEE_COLLECTOR_OP production     # 0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3
vercel env add NEXT_PUBLIC_FEE_COLLECTOR_POLYGON production # 0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3
vercel env add NEXT_PUBLIC_FEE_COLLECTOR_BASE production   # 0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3
vercel env add NEXT_PUBLIC_FEE_COLLECTOR_AVAX production   # 0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3
vercel env add NEXT_PUBLIC_FEE_COLLECTOR_BSC production    # 0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3

# === REFERRAL CODES ===
vercel env add THORCHAIN_AFFILIATE_CODE production   # cy
vercel env add THORCHAIN_AFFILIATE_ADDRESS production # 358ecZEdxH6jEQCVBjE4DcDq4qWHn1WWgGFb
vercel env add HYPERLIQUID_REFERRAL_CODE production  # CYPHER
vercel env add GMX_REFERRAL_CODE production          # cypher
vercel env add KWENTA_REFERRAL_CODE production       # cypher

# === HYPERLIQUID DEX ===
vercel env add HYPERLIQUID_API_URL production  # https://api.hyperliquid.xyz
vercel env add HYPERLIQUID_TESTNET production  # false

# === RATE LIMITING ===
vercel env add RATE_LIMIT_WINDOW_MS production   # 900000
vercel env add RATE_LIMIT_MAX_REQUESTS production # 100
```

### 1.3 — Após configurar, fazer redeploy:

```bash
vercel --prod
```

---

## PARTE 2: TESTAR FLUXO COMPLETO DE ACESSO

### 2.1 — Hierarquia de Acesso (GARANTIR QUE FUNCIONA)

```
NÍVEL 4 — SUPER ADMIN (0% fees + ALL features + admin):
  ETH: 0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3
  → Deve ter acesso a TUDO: Dashboard, Market, Trading, Ordinals, Runes,
    Cypher AI, Hacker Yields, Arbitrage, Swap, BRC-20, Rare Sats,
    Portfolio, Analytics, Social, Settings

NÍVEL 3 — VIP BTC WALLETS (0% fees + ALL features):
  BTC1: bc1pe5nke262wwvpmg3f9w9a0huwg30cculrnjysd3yrmvew3wgc6ydsqr0t98
  BTC2: bc1pm2cm5erm245jkwtdl64medqd4utf32m4y9m8qkcfpg37jgqw8rxq9d3kn9
  BTC3: bc1pp546x6uxwl5vjtw3h4rjaj8pcr8ny688ax5jf4ygng73csa2jd3sengvuy
  → Deve ter acesso a TUDO igual super_admin

NÍVEL 2 — YHP NFT HOLDERS (premium features):
  Contrato: 0xf4b6f2ab709703aa1a3e47fa0183ec700017c62b (Ethereum ERC-721)
  → Qualquer wallet com balanceOf > 0 neste contrato = premium
  → Acesso equivalente a hacker_yields tier (ALL features)

NÍVEL 1 — STRIPE SUBSCRIBERS (features por tier):
  Explorer ($29/mo): Dashboard, Portfolio, Market Data, Swap, Ordinals viewer
  Trader ($79/mo): + Arbitrage, Cypher AI, Neural, Alerts, Paper Trading
  Hacker Yields ($149/mo): + AI Agent, Multi-agent, Auto-compound, MEV

NÍVEL 0 — FREE (sem wallet, sem subscription):
  → SÓ Dashboard básico
  → Todas as outras features mostram paywall com "Subscribe" ou "Connect Wallet"
```

### 2.2 — Testes a Executar

#### Teste A: Super Admin ETH Wallet
1. Conectar MetaMask com wallet `0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3`
2. Navegar para CADA página premium (Market, Trading, Ordinals, Cypher AI, Hacker Yields, Arbitrage)
3. Verificar que NENHUMA mostra paywall
4. Verificar que o badge "ADMIN" ou "Super Admin" aparece na navbar
5. Verificar que 0% fees aparece em Swap/Trading

#### Teste B: VIP BTC Wallet
1. Conectar uma das 3 wallets BTC via UniSat/Xverse
2. Verificar acesso total a todas as features
3. Verificar badge "VIP" na navbar

#### Teste C: YHP Holder
1. Conectar MetaMask com wallet que possui YHP NFT
2. Verificar que `useYHPVerification` detecta `balanceOf > 0`
3. Verificar badge "YHP HOLDER" na navbar
4. Verificar acesso a todas as features premium

#### Teste D: Stripe Subscriber (sem wallet premium)
1. Ir para /pricing
2. Clicar "Connect Wallet" → MetaMask deve abrir
3. Conectar wallet comum (sem YHP, sem VIP)
4. Clicar "Subscribe" no plano Trader ($79)
5. Verificar redirect para Stripe Checkout
6. Completar pagamento (usar cartão de teste: 4242 4242 4242 4242)
7. Verificar redirect de volta para /settings?tab=subscription&checkout=success
8. Navegar para Cypher AI → deve abrir (tier trader)
9. Navegar para Hacker Yields → deve mostrar paywall (requer tier hacker_yields)

#### Teste E: Usuário Free (sem nada)
1. Abrir site em aba anônima (sem wallet, sem login)
2. Dashboard (/) → deve carregar normalmente
3. Market (/market) → deve mostrar paywall "YHP ACCESS"
4. Trading (/trading) → deve mostrar paywall
5. Cypher AI (/cypher-ai) → deve mostrar paywall
6. Hacker Yields (/hacker-yields) → deve mostrar paywall
7. Pricing (/pricing) → deve mostrar planos e botões "Connect Wallet"
8. Arbitrage (/arbitrage) → tab "Live Scanner" deve ser free, tabs premium devem ser gated

---

## PARTE 3: CORRIGIR BUGS ENCONTRADOS

### Bug List Conhecida (do Audit Report):

#### SEGURANÇA (corrigir ANTES de ativar Stripe em produção):

1. **SEC-01 CRITICAL**: Stripe webhook sem validação de assinatura
   - Arquivo: `src/lib/stripe/webhook-handlers.ts` ou `src/app/api/subscription/webhook/route.ts`
   - Fix: Implementar `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`
   - Sem isso, qualquer POST pode simular webhook e dar subscription grátis

2. **SEC-02 CRITICAL**: API /agent aceita walletAddress sem verificar ownership
   - Arquivo: `src/app/api/agent/route.ts`
   - Fix: Exigir assinatura EIP-712 ou JWT da wallet antes de aceitar credenciais
   - Sem isso, alguém pode iniciar trading agent com wallet de terceiro

3. **SEC-06 MEDIUM**: Premium bypass via localStorage
   - Qualquer usuário pode setar `premium_cache` no localStorage para pular paywall
   - O PremiumContext já mitiga parcialmente (não aceita super_admin/vip de cache)
   - Fix: Para features críticas (Hacker Yields trading), SEMPRE verificar server-side

### FUNCIONALIDADE:

4. **Miners NaN values** → JÁ CORRIGIDO (null checks em 4 hooks + page component)
5. **Pricing buttons** → JÁ CORRIGIDO (ETH wallet + fallback BTC + listener no MainNavigation)
6. **UnifiedNavbar dead code** → Remover `src/components/unified-navbar.tsx` (não é usado, confunde)

---

## PARTE 4: VERIFICAÇÃO FINAL PÓS-DEPLOY

Após o deploy, execute estes checks:

```bash
# 1. Verificar que o site carrega
curl -s -o /dev/null -w "%{http_code}" https://cypherordifuture.xyz/

# 2. Verificar que API routes respondem
curl -s https://cypherordifuture.xyz/api/subscription/status | jq .
curl -s https://cypherordifuture.xyz/api/market/multi-asset | jq . | head -20

# 3. Verificar Stripe webhook endpoint
curl -s -X POST https://cypherordifuture.xyz/api/subscription/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}' | jq .
# Deve retornar erro 400 (webhook signature missing), NÃO 500

# 4. Verificar console do browser em cada página
# Abrir DevTools → Console → Navegar por todas as páginas
# Não deve haver erros vermelhos críticos

# 5. Verificar Stripe Dashboard
# https://dashboard.stripe.com/webhooks
# Confirmar que o endpoint https://cypherordifuture.xyz/api/subscription/webhook está ativo
# Confirmar que os events checkout.session.completed, customer.subscription.* estão habilitados

# 6. Testar Stripe Checkout (modo teste)
# Se Stripe estiver em modo teste, usar cartão: 4242 4242 4242 4242
# Se Stripe estiver em modo live, usar valor real com cartão real
```

---

## PARTE 5: WALLETS E CONTRATOS PARA REFERÊNCIA

### Sua Wallet (Super Admin / CEO):
```
ETH: 0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3
```

### VIP BTC Wallets:
```
bc1pe5nke262wwvpmg3f9w9a0huwg30cculrnjysd3yrmvew3wgc6ydsqr0t98
bc1pm2cm5erm245jkwtdl64medqd4utf32m4y9m8qkcfpg37jgqw8rxq9d3kn9
bc1pp546x6uxwl5vjtw3h4rjaj8pcr8ny688ax5jf4ygng73csa2jd3sengvuy
```

### YHP Contract (Ethereum):
```
Address: 0xf4b6f2ab709703aa1a3e47fa0183ec700017c62b
Type: ERC-721
Verification: balanceOf(address) > 0
RPC: https://cloudflare-eth.com
```

### Fee Collection Wallets:
```
EVM (todas as chains): 0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3
Solana: 4boXQgNGuKEvEzVN3vjDHC6j4RsSPyMFAadUhBg7JCwRH
Bitcoin: 358ecZEdxH6jEQCVBjE4DcDq4qWHn1WWgGFb
Swap Fee: 0.3% (30 bps)
```

### Stripe Products:
```
Explorer: price_1T5LozFaMYusyYVbRFW9lFQE ($29/mo)
Trader:   price_1T5LqSFaMYusyYVbUDApUlpt ($79/mo)
Hacker Yields: price_1T5LrGFaMYusyYVbgliuNmV9 ($149/mo)
```

---

## COMANDO PARA EXECUTAR

```bash
claude --dangerously-skip-permissions "Leia o arquivo DEPLOY-MASTER-PROMPT.md na raiz do projeto. Execute TUDO sequencialmente: (1) Configure todas as env vars no Vercel usando 'vercel env add'. Leia os valores do .env local. (2) Faça redeploy com 'vercel --prod'. (3) Teste o site ao vivo — navegue por todas as 18 páginas e verifique se carregam. (4) Teste que a wallet 0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3 tem super_admin access. (5) Teste que /pricing funciona (botões Connect Wallet abrem MetaMask). (6) Teste que usuário sem wallet vê paywall em features premium. (7) Corrija os 3 bugs de segurança SEC-01, SEC-02, SEC-06. (8) Rode 'npm run build' para verificar que compila. (9) Gere um relatório final com todos os resultados."
```

---

## RESUMO EXECUTIVO

| Item | Status | Ação |
|------|--------|------|
| Env vars no Vercel | PENDENTE | Configurar ~80 vars (Parte 1) |
| Pricing buttons | ✅ CORRIGIDO | ETH+BTC wallet connect |
| Miners NaN | ✅ CORRIGIDO | Null checks em hooks |
| Stripe webhook security | ⚠️ PENDENTE | Implementar signature validation |
| API auth | ⚠️ PENDENTE | Adicionar wallet signature |
| localStorage bypass | ⚠️ PENDENTE | Server-side check em features críticas |
| Super admin access | ✅ CONFIGURADO | 0xAE3642... = all access |
| VIP BTC wallets | ✅ CONFIGURADO | 3 wallets = all access |
| YHP NFT holders | ✅ CONFIGURADO | Contract 0xf4b6... = premium |
| Stripe subscriptions | ✅ CONFIGURADO | 3 tiers ($29/$79/$149) |
| Free user paywall | ✅ CONFIGURADO | PremiumContent gate ativo |
