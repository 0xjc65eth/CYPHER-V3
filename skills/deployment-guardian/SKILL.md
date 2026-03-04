---
name: deployment-guardian
description: Protege o CYPHER V3 em produção — checklist de deploy, environment variables, health checks, rollback automático, zero downtime
version: "4.0"
tags: [deployment, production, safety, health-checks, environment, vercel, railway]
---

# SKILL: Deployment Guardian — CYPHER V3

## Princípio
Um deploy com bug em produção afeta traders com dinheiro real. Cada deploy passa por um checklist rigoroso antes de ir para produção.

## Pre-Deploy Checklist (OBRIGATÓRIO)

### 1. Qualidade de Código
```bash
# TypeScript zero errors
npm run type-check 2>&1 | grep -E "error TS" | wc -l
# → deve ser 0

# Lint zero critical
npm run lint 2>&1 | grep "error" | wc -l
# → deve ser 0 (warnings aceitáveis)

# Build passa
npm run build 2>&1 | tail -5
# → deve incluir "✓ Compiled successfully"

# Bundle não regrediu
npm run build 2>&1 | grep "First Load JS"
# → deve ser < 300KB (alerta > 400KB)
```

### 2. Segurança
```bash
# Sem API keys no código
git diff HEAD~1 --name-only | xargs grep -l "sk_\|pk_\|API_KEY\|SECRET" 2>/dev/null | \
  grep -v ".env\|example\|test" | head -5

# Sem console.log adicionados
git diff HEAD~1 -- "*.ts" "*.tsx" | grep "^+" | grep "console\.log" | head -10

# Sem mock data introduzido
git diff HEAD~1 -- "*.ts" "*.tsx" | grep "^+" | grep "mockData\|MOCK_\|Math\.random" | head -5

# npm audit
npm audit --audit-level=high 2>&1 | grep -E "HIGH|CRITICAL" | wc -l
# → deve ser 0
```

### 3. Environment Variables
```bash
# Verificar que todas as vars necessárias estão configuradas no Vercel/Railway
node -e "
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'HIRO_API_KEY',
  'COINGECKO_API_KEY',
  'UNISAT_API_KEY',
  'OKX_API_KEY',
  'REDIS_URL',
  'REDIS_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'AGENT_PRIVATE_KEY',
]

const missing = required.filter(k => !process.env[k])
if (missing.length > 0) {
  console.error('❌ ENV VARS em falta:', missing.join(', '))
  process.exit(1)
}
console.log('✅ Todas as env vars configuradas')
"
```

### 4. Testes de Saúde das APIs
```bash
# Testar em staging antes de produção
STAGING_URL="https://cypher-v3-staging.vercel.app"

test_health() {
  local url=$1 expected=$2 name=$3
  local status=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  [ "$status" = "$expected" ] && echo "✅ $name ($status)" || echo "❌ $name — got $status, expected $expected"
}

test_health "$STAGING_URL/api/health"              "200" "Health check"
test_health "$STAGING_URL/api/market/bitcoin"      "200" "BTC Price"
test_health "$STAGING_URL/api/ordinals/collections" "200" "Ordinals"
test_health "$STAGING_URL/api/runes/market"        "200" "Runes"
test_health "$STAGING_URL/api/fees"                "200" "Bitcoin Fees"
```

## API Health Endpoint (implementar se não existir)
```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { cache } from '@/lib/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const checks: Record<string, 'ok' | 'error' | 'degraded'> = {}
  
  // Check Redis/Cache
  try {
    await cache.set('health:ping', 'pong', 10)
    const pong = await cache.get<string>('health:ping')
    checks.cache = pong === 'pong' ? 'ok' : 'degraded'
  } catch {
    checks.cache = cache.isUsingMemory() ? 'degraded' : 'error'
  }
  
  // Check Supabase
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    await supabase.from('users').select('count').limit(1)
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
  }
  
  // Check Hiro API
  try {
    const res = await fetch('https://api.hiro.so/extended/v1/status', { signal: AbortSignal.timeout(3000) })
    checks.hiro = res.ok ? 'ok' : 'degraded'
  } catch {
    checks.hiro = 'error'
  }
  
  // Check CoinGecko
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/ping', { signal: AbortSignal.timeout(3000) })
    checks.coingecko = res.ok ? 'ok' : 'degraded'
  } catch {
    checks.coingecko = 'error'
  }
  
  const hasErrors = Object.values(checks).includes('error')
  const hasDegraded = Object.values(checks).includes('degraded')
  const overallStatus = hasErrors ? 'error' : hasDegraded ? 'degraded' : 'ok'
  
  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? 'local',
      checks,
    },
    { status: hasErrors ? 503 : 200 }
  )
}
```

## Rollback Guide
```bash
# Vercel — rollback para deploy anterior
vercel rollback [deployment-url]

# Ou via dashboard Vercel:
# Deployments → Previous deploy → "..." → Promote to Production

# Git — revert commit específico
git revert [commit-sha] --no-edit
git push origin main

# Emergency — reverter ficheiro específico
git checkout [commit-sha] -- src/lib/api/ordinals.ts
git commit -m "revert(ordinals): emergency rollback to working version"
git push origin main
```

## Monitoring em Produção
```bash
# Ver logs de erros em tempo real (Vercel)
vercel logs --follow --since 1h | grep -E "ERROR|error|500|timeout"

# Verificar se alguma API está a falhar
watch -n 30 'curl -s https://cypher-v3.vercel.app/api/health | node -e "
const d=JSON.parse(require(\"fs\").readFileSync(\"/dev/stdin\",\"utf8\"))
console.log(new Date().toLocaleTimeString(), d.status, JSON.stringify(d.checks))
"'
```

## Conventional Commits para Deploy
```bash
# Formato para commit que vai para produção
# fix(módulo): descrição clara do que foi corrigido
# feat(módulo): descrição da nova feature
# perf(módulo): melhoria de performance
# security(módulo): fix de segurança

# Antes de merge para main:
git log staging..HEAD --oneline  # ver o que vai fazer deploy
git diff staging --stat           # ver ficheiros alterados
```

## Checklist Final (copy-paste antes de cada deploy)
```
□ npm run type-check → 0 errors
□ npm run lint → 0 errors críticos  
□ npm run build → compila sem erro
□ First Load JS < 300KB
□ npm audit → 0 HIGH/CRITICAL
□ Sem console.log no diff
□ Sem mock data no diff
□ Sem API keys hardcoded
□ ENV vars verificadas em staging
□ /api/health em staging → 200 OK
□ APIs principais testadas em staging
□ Commit message segue Conventional Commits
□ PR description explica "porquê" não só "o quê"
```
