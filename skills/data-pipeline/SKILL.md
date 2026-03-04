---
name: data-pipeline
description: Garante o fluxo correto de dados desde APIs externas até ao utilizador — cache em camadas, fallbacks inteligentes, transformação de dados, sem dados stale ou inválidos na UI
version: "4.0"
tags: [data-flow, caching, pipeline, transformation, redis, react-query]
---

# SKILL: Data Pipeline — CYPHER V3

## Arquitetura do Pipeline de Dados

```
[APIs Externas]  →  [Edge Cache]  →  [Redis/Upstash]  →  [API Routes]  →  [React Query]  →  [UI]
  Hiro, CoinGecko    Vercel CDN       Shared cache       Next.js           Client cache     Componentes
  UniSat, OKX        60-300s          15-300s TTL        /api/*            30-300s stale
```

## Implementação Completa por Módulo

### 1. Bitcoin Price Pipeline
```typescript
// src/lib/pipelines/btc-price.ts

import { cache } from '@/lib/cache'
import { z } from 'zod'

const BTCPriceSchema = z.object({
  bitcoin: z.object({
    usd: z.number().positive(),
    usd_24h_change: z.number(),
    usd_24h_vol: z.number().positive(),
    usd_market_cap: z.number().positive(),
    last_updated_at: z.number(),
  })
})

export type BTCPrice = {
  price: number
  change24h: number
  volume24h: number
  marketCap: number
  updatedAt: number
  source: 'coingecko' | 'binance' | 'cache'
}

export async function getBTCPrice(): Promise<BTCPrice> {
  const CACHE_KEY = 'btc:price:v1'
  const TTL = 15 // 15 segundos — preço muda constantemente
  
  // L1: Redis cache
  const cached = await cache.get<BTCPrice>(CACHE_KEY)
  if (cached && (Date.now() - cached.updatedAt) < TTL * 1000) {
    return { ...cached, source: 'cache' }
  }
  
  // L2: CoinGecko (principal)
  try {
    const res = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true',
      { headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || '' } },
      5000
    )
    const raw = await res.json()
    const parsed = BTCPriceSchema.parse(raw)
    
    const data: BTCPrice = {
      price: parsed.bitcoin.usd,
      change24h: parsed.bitcoin.usd_24h_change,
      volume24h: parsed.bitcoin.usd_24h_vol,
      marketCap: parsed.bitcoin.usd_market_cap,
      updatedAt: Date.now(),
      source: 'coingecko',
    }
    
    await cache.set(CACHE_KEY, data, TTL)
    return data
    
  } catch (cgError) {
    // L3: Fallback Binance REST
    try {
      const res = await fetchWithTimeout(
        'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
        {},
        5000
      )
      const ticker = await res.json()
      
      const data: BTCPrice = {
        price: parseFloat(ticker.lastPrice),
        change24h: parseFloat(ticker.priceChangePercent),
        volume24h: parseFloat(ticker.quoteVolume),
        marketCap: 0, // Binance não tem market cap
        updatedAt: Date.now(),
        source: 'binance',
      }
      
      await cache.set(CACHE_KEY, data, TTL)
      return data
      
    } catch {
      // L4: Retornar cache stale se existir (melhor que nada)
      if (cached) {
        console.warn('[BTC Price] Using stale cache from', new Date(cached.updatedAt))
        return { ...cached, source: 'cache' }
      }
      throw new Error('BTC price unavailable from all sources')
    }
  }
}
```

### 2. Ordinals Collections Pipeline
```typescript
// src/lib/pipelines/ordinals.ts

const OrdinalCollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  floor_price: z.string().nullable(), // Hiro retorna como string
  volume_24h: z.string().nullable(),
  inscription_count: z.number(),
  listed_count: z.number().nullable().optional(),
})

type RawHiroCollection = z.infer<typeof OrdinalCollectionSchema>

// Transformar dados brutos Hiro → formato CYPHER V3
function transformCollection(raw: RawHiroCollection): OrdinalCollection {
  return {
    id: raw.id,
    name: raw.name,
    floorPrice: raw.floor_price ? parseInt(raw.floor_price) / 1e8 : 0, // sats → BTC
    volume24h: raw.volume_24h ? parseInt(raw.volume_24h) / 1e8 : 0,
    inscriptionCount: raw.inscription_count,
    listed: raw.listed_count ?? 0,
    image: `https://ordinals.com/content/${raw.id}i0`, // convenção de URL
  }
}

export async function getOrdinalCollections(params: {
  limit?: number
  offset?: number
  orderBy?: 'volume_24h' | 'floor_price' | 'inscription_count'
}): Promise<{ data: OrdinalCollection[]; total: number }> {
  const { limit = 20, offset = 0, orderBy = 'volume_24h' } = params
  const CACHE_KEY = `ordinals:collections:${orderBy}:${offset}:${limit}`
  const TTL = 60 // 60 segundos
  
  const cached = await cache.get<{ data: OrdinalCollection[]; total: number }>(CACHE_KEY)
  if (cached) return cached
  
  const url = new URL('https://api.hiro.so/ordinals/v1/collections')
  url.searchParams.set('limit', limit.toString())
  url.searchParams.set('offset', offset.toString())
  url.searchParams.set('order_by', orderBy)
  url.searchParams.set('order', 'desc')
  
  const res = await fetchWithTimeout(
    url.toString(),
    { headers: { 'x-hiro-api-key': process.env.HIRO_API_KEY || '' } },
    8000
  )
  
  const json = await res.json()
  
  // Validar schema antes de transformar
  const rawCollections = z.array(OrdinalCollectionSchema).parse(json.results ?? [])
  
  const result = {
    data: rawCollections.map(transformCollection),
    total: json.total ?? rawCollections.length,
  }
  
  await cache.set(CACHE_KEY, result, TTL)
  return result
}
```

### 3. Runes Pipeline (Hiro Runehook)
```typescript
// src/lib/pipelines/runes.ts

const RuneSchema = z.object({
  id: z.string(),
  name: z.string(),
  spaced_name: z.string(),
  symbol: z.string().nullable(),
  total_supply: z.string(), // bigint como string
  total_mints: z.number(),
  total_holders: z.number(),
  divisibility: z.number(),
  // Market data (nem sempre disponível)
  price_in_sats: z.number().nullable().optional(),
  volume_24h: z.number().nullable().optional(),
  market_cap_btc: z.number().nullable().optional(),
})

function transformRune(raw: z.infer<typeof RuneSchema>): RuneMarket {
  const priceInSats = raw.price_in_sats ?? 0
  const supply = BigInt(raw.total_supply)
  const supplyNum = Number(supply) // pode perder precisão para supply muito grande
  
  return {
    id: raw.id,
    name: raw.spaced_name || raw.name,  // preferir formato com pontos
    symbol: raw.symbol ?? raw.name.slice(0, 4),
    price: priceInSats,
    marketCap: raw.market_cap_btc ?? (priceInSats * supplyNum) / 1e8,
    volume24h: raw.volume_24h ?? 0,
    holders: raw.total_holders,
    supply: raw.total_supply,
    divisibility: raw.divisibility,
    totalMints: raw.total_mints,
  }
}
```

### 4. Mempool / Fees Pipeline
```typescript
// src/lib/pipelines/fees.ts
// mempool.space é público — sem API key necessária

export async function getBitcoinFees(): Promise<FeeEstimate> {
  const CACHE_KEY = 'bitcoin:fees:v1'
  const TTL = 30 // 30 segundos — fees mudam frequentemente

  const cached = await cache.get<FeeEstimate>(CACHE_KEY)
  if (cached && (Date.now() - cached.updatedAt) < TTL * 1000) return cached

  const [feesRes, mempoolRes] = await Promise.allSettled([
    fetchWithTimeout('https://mempool.space/api/v1/fees/recommended', {}, 5000),
    fetchWithTimeout('https://mempool.space/api/mempool', {}, 5000),
  ])

  const fees = feesRes.status === 'fulfilled' ? await feesRes.value.json() : null
  const mempool = mempoolRes.status === 'fulfilled' ? await mempoolRes.value.json() : null

  const result: FeeEstimate = {
    fastestFee: fees?.fastestFee ?? 0,
    halfHourFee: fees?.halfHourFee ?? 0,
    hourFee: fees?.hourFee ?? 0,
    economyFee: fees?.economyFee ?? 0,
    minimumFee: fees?.minimumFee ?? 1,
    mempoolSize: mempool?.count ?? 0,
    mempoolVsize: mempool?.vsize ?? 0,
    updatedAt: Date.now(),
  }

  await cache.set(CACHE_KEY, result, TTL)
  return result
}
```

## Scan de Problemas no Pipeline Atual
```bash
# 1. Fetches sem schema validation (Zod)
grep -rn "await.*\.json()" src/app/api/ --include="*.ts" | \
  grep -v "\.parse\|\.safeParse\|\.parseAsync" | head -20

# 2. Dados sem transformação (retornar raw API para o frontend)
grep -rn "return.*json()" src/app/api/ --include="*.ts" | \
  grep -v "transform\|map\|format" | head -10

# 3. Sem cache em API routes
grep -rn "export async function GET\|export async function POST" \
  src/app/api/ --include="*.ts" -l | \
  xargs grep -L "cache\|Redis\|revalidate" 2>/dev/null | head -10

# 4. TTL muito alto (dados stale)
grep -rn "revalidate\|TTL\|ttl" src/app/api/ --include="*.ts" | \
  grep -E "[0-9]{4,}" | head -10  # mais de 1000 segundos
```

## TTL Guide para Cada Tipo de Dado
```typescript
export const DATA_TTL = {
  // Mercado (muda constantemente)
  btcPrice: 15,          // 15s
  btcFees: 30,           // 30s
  runesPrices: 60,       // 1 min
  
  // Ordinals (muda cada alguns minutos)
  ordinalFloor: 60,      // 1 min
  ordinalVolume: 120,    // 2 min
  
  // Dados de coleção (muda lentamente)
  collectionInfo: 300,   // 5 min
  runeDetails: 300,      // 5 min
  rareSatsCategories: 600, // 10 min
  
  // Dados de utilizador (invalidar por evento)
  walletBalance: 30,     // 30s
  walletOrdinals: 120,   // 2 min
  walletRunes: 120,      // 2 min
  
  // Dados estáticos
  inscriptionContent: 3600, // 1 hora — não muda
} as const
```
