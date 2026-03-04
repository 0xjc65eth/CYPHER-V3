---
name: security-auditor
description: Audita segurança do CYPHER V3 — API keys, autenticação, rate limiting, wallet security, inputs
version: "2.0"
tags: [security, audit, api-keys, authentication, wallet, crypto]
---

# SKILL: Security Auditor — CYPHER V3

## Scan de Segurança Inicial (EXECUTAR SEMPRE PRIMEIRO)
```bash
# 1. API keys expostas no código
grep -rn "sk_\|pk_\|api_key\|API_KEY\|secret\|SECRET\|password\|PASSWORD" src/ --include="*.ts" --include="*.tsx" | grep -v "process\.env\|\.env\|example\|test"

# 2. NEXT_PUBLIC_ com dados sensíveis
grep -rn "NEXT_PUBLIC_" .env.local .env.example 2>/dev/null | grep -iE "secret|key|password|token|private"

# 3. npm audit
npm audit --audit-level=high

# 4. Hardcoded endpoints HTTP (deve ser HTTPS)
grep -rn "http://" src/ | grep -v "localhost\|127\.0\|test\|comment"

# 5. eval() ou injeção de código
grep -rn "eval(\|new Function(\|innerHTML\s*=" src/ --include="*.ts" --include="*.tsx"
```

## Checklist de Segurança por Categoria

### API Keys e Secrets
```bash
# Verificar .gitignore
grep -E "\.env\.local|\.env\.production" .gitignore

# Verificar se há keys no histórico git
git log --all --full-history --oneline | head -20
git grep -i "secret\|api_key" $(git rev-list --all) 2>/dev/null | head -10
```

**Variáveis obrigatórias em Railway/Vercel (NUNCA no código):**
- `NEXTAUTH_SECRET`, `JWT_SECRET`, `ADMIN_JWT_SECRET`
- `AGENT_ENCRYPTION_KEY`, `SECURITY_ENCRYPTION_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Todas as API keys de exchanges e market data

### Rate Limiting
**Verificar em todas as rotas críticas:**
```bash
# Rotas sem rate limiting
grep -rn "export async function" src/app/api/ | grep -v "withRateLimit\|rateLimit"
```

**Rotas que DEVEM ter rate limiting:**
- `/api/agent/*` — máximo 10 req/min
- `/api/trading/*` — máximo 30 req/min
- `/api/auth/*` — máximo 5 tentativas/15min
- `/api/runes/*`, `/api/ordinals/*` — máximo 60 req/min

**Implementação correta:**
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/cache/redis'

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { success, limit, reset, remaining } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString(),
        },
      }
    )
  }
  // continuar
}
```

### Wallet Security
**Verificar em `src/agent/wallet/`:**
```bash
grep -rn "privateKey\|mnemonic\|seed" src/ | grep -v "test\|mock\|comment"
```

**Padrões obrigatórios:**
```typescript
// NUNCA armazenar private keys em localStorage
// ✅ CORRETO — sempre usar SecureKeyStore
import { SecureKeyStore } from '@/agent/wallet/SecureKeyStore'

// SEMPRE validar endereços antes de transações
import { isValidBitcoinAddress } from '@/lib/utils/validation'
import { isAddress } from 'viem'  // para EVM

// SEMPRE simular transação antes de executar
const simulation = await simulateTransaction(params)
if (!simulation.success) throw new Error(simulation.error)
```

### Stripe Webhook
```typescript
// DEVE verificar assinatura em /api/webhooks/stripe
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  // processar evento
}
```

### Headers de Segurança
**Verificar em `next.config.js`:**
```javascript
// DEVEM existir estes headers
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
```

### Supabase RLS (Row Level Security)
```bash
# Verificar se RLS está ativo nas tabelas sensíveis
# No Supabase Dashboard → Table Editor → selecionar tabela → RLS deve estar ON
# Tabelas críticas: users, transactions, agent_sessions, trading_positions
```

### Input Sanitization
```typescript
// SEMPRE sanitizar inputs antes de queries
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

const SafeStringSchema = z.string()
  .min(1)
  .max(500)
  .regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Invalid characters')

// Para conteúdo HTML
const sanitized = DOMPurify.sanitize(userInput, { ALLOWED_TAGS: [] })
```

## Relatório de Auditoria (formato de output)
```
## Auditoria de Segurança — CYPHER V3
**Data:** [data]
**Commit:** [hash]

### 🔴 CRÍTICO (bloqueia produção)
- [ ] item 1

### 🟡 ALTO (resolver em 48h)
- [ ] item 1

### 🟢 MÉDIO (resolver na próxima sprint)
- [ ] item 1

### ✅ OK
- rate limiting: ativo
- headers: configurados
```

## Vulnerabilidades Conhecidas no Ecossistema
- **Magic Eden API**: a deprecar Ordinals/Runes — migrar para OKX NFT + Gamma.io
- **@omnisat/lasereyes**: verificar versão `^0.0.156` — atualizações frequentes de segurança
- **sats-connect**: `^3.6.1` — verificar CVEs antes de atualizar
- `npm audit` DEVE retornar zero HIGH/CRITICAL antes de qualquer deploy
