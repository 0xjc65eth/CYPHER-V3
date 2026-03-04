---
name: code-writer
description: Escreve código TypeScript/React/Next.js de produção para CYPHER V3
version: "2.0"
tags: [typescript, nextjs, react, blockchain]
---

# SKILL: Code Writer — CYPHER V3

## Stack Obrigatório
- **Next.js 15** App Router (NUNCA Pages Router)
- **React 18** — Server Components por defeito; `'use client'` só quando necessário
- **TypeScript 5** strict mode — ZERO `any` implícito
- **Tailwind CSS** com design system Bloomberg abaixo
- **Zod** em TODAS as API routes sem exceção
- **React Query v5** para data fetching
- **Zustand** para estado global

## Design System Bloomberg Terminal
```
--orange:       #FF6B00   // CTAs, ações primárias
--orange-muted: #FF8C00   // hover, secundário
--bg:           #000000   // background
--surface:      #0a0a0a   // cards, painéis
--border:       #1a1a1a   // bordas subtis
--border-bright:#333333   // bordas visíveis
--text:         #FFFFFF   // texto primário
--muted:        #666666   // texto secundário
--success:      #00FF41   // lucro, positivo
--danger:       #FF0040   // perda, erro
--warning:      #FFB800   // aviso
--rare-purple:  #8B5CF6   // Rare Sats module
--rare-gold:    #F59E0B   // tier alto Rare Sats
```

## Template: API Route
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withRateLimit } from '@/lib/middleware/rateLimit'

const Schema = z.object({ /* campos */ })

export async function GET(req: NextRequest) {
  return withRateLimit(req, async () => {
    const query = Schema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
    if (!query.success) {
      return NextResponse.json({ error: 'Invalid params', details: query.error.flatten() }, { status: 400 })
    }
    try {
      const result = await /* lógica */
      return NextResponse.json({ data: result })
    } catch (error) {
      console.error('[ROUTE_NAME]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}
```

## Template: React Component
```typescript
'use client'
import { useQuery } from '@tanstack/react-query'

interface Props { /* tipagem explícita sempre */ }

export function ComponentName({ }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['key'],
    queryFn: async () => {
      const res = await fetch('/api/endpoint')
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    staleTime: 30_000,
  })

  if (isLoading) return <div className="animate-pulse bg-[#1a1a1a] rounded h-20" />
  if (error) return <div className="text-[#FF0040] text-sm p-4">Erro ao carregar dados</div>

  return (
    <div className="bg-[#0a0a0a] border border-[#333333] rounded-lg p-4">
      {/* conteúdo */}
    </div>
  )
}
```

## Template: Custom Hook
```typescript
import { useQuery } from '@tanstack/react-query'

export function useFeature(params: FeatureParams) {
  return useQuery({
    queryKey: ['feature', params],
    queryFn: async () => {
      const res = await fetch(`/api/feature?${new URLSearchParams(params as Record<string, string>)}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  })
}
```

## Regras Críticas (nunca violar)
1. NUNCA `export default` em API routes — named exports (`GET`, `POST`, `PUT`, `DELETE`)
2. NUNCA expor secrets em `NEXT_PUBLIC_*` — apenas URLs públicas e feature flags
3. SEMPRE Zod antes de processar qualquer input externo
4. NUNCA `console.log` em produção — `console.error` ou logger estruturado
5. SEMPRE loading + error states em componentes com data fetching
6. NUNCA fetch direto em componentes — hooks ou Server Components
7. NUNCA Magic Eden para Ordinals/Runes — está a deprecar suporte

## APIs Disponíveis no Projeto
```typescript
import { HiroAPI } from '@/lib/api/hiro'           // Ordinals, BRC-20
import { OrdiscanAPI } from '@/lib/api/ordiscan'   // Ordinals data
import { UniSatAPI } from '@/lib/api/unisat'       // Inscriptions, BRC-20
import { OKXNFTApi } from '@/lib/api/okx-nft'     // SUBSTITUTO Magic Eden
import { GammaAPI } from '@/lib/api/gamma'         // Ordinals marketplace backup
import { CCXTBridge } from '@/lib/api/ccxt'        // 130+ exchanges
import { redis } from '@/lib/cache/redis'          // Cache (fallback in-memory auto)
```

## Checklist Antes de Escrever
- [ ] `grep -r "ComponentName" src/` — existe já?
- [ ] Imports disponíveis em `package.json`?
- [ ] Design system — sem hex hardcoded
- [ ] `npm run type-check` após criar
- [ ] Testes unitários necessários?
