---
name: mock-eliminator
description: Elimina todo o mock data do CYPHER V3 e substitui por integrações reais com APIs de produção
version: "2.0"
tags: [mock-data, api-integration, production, ordinals, runes]
---

# SKILL: Mock Eliminator — CYPHER V3

## Scan Completo de Mock Data
```bash
# Executar SEMPRE no início
grep -rn "mockData\|MOCK_DATA\|mock_data\|isMock\|useMock" src/ --include="*.ts" --include="*.tsx"
grep -rn "fakePrices\|dummyData\|sampleData\|testData\|placeholderData" src/
grep -rn "Math\.random()\|Math\.floor(Math\.random" src/ --include="*.ts" --include="*.tsx"
grep -rn "hardcoded\|HARDCODED\|// TODO.*real\|// FIXME.*api\|// temp\|// temporary" src/
grep -rn "\[\s*{.*name.*price.*volume.*}\s*\]" src/  # arrays hardcoded de assets
```

## Mapa de Substituições CYPHER V3

### Ordinals Mock → Hiro API Real
```typescript
// ❌ MOCK (remover)
const mockCollections = [
  { name: "NodeMonkes", floorPrice: 0.05, volume24h: 12.5 },
  { name: "Bitcoin Puppets", floorPrice: 0.03, volume24h: 8.2 },
]

// ✅ REAL (substituir por)
import { HiroAPI } from '@/lib/api/hiro'

async function getOrdinalCollections() {
  const hiro = new HiroAPI()
  return await hiro.getCollections({
    limit: 20,
    sortBy: 'volume_24h',
    order: 'desc'
  })
}
```

### Runes Mock → Hiro/UniSat API Real
```typescript
// ❌ MOCK
const mockRunes = [
  { name: "DOG•GO•TO•THE•MOON", price: 0.000001, marketCap: 50000 },
]

// ✅ REAL
import { HiroAPI } from '@/lib/api/hiro'

async function getRunesMarket() {
  const hiro = new HiroAPI()
  return await hiro.getRunes({ limit: 50, orderBy: 'market_cap' })
}
```

### BRC-20 Mock → UniSat API Real
```typescript
// ✅ REAL
import { UniSatAPI } from '@/lib/api/unisat'

async function getBRC20Tokens() {
  const unisat = new UniSatAPI(process.env.UNISAT_API_KEY!)
  return await unisat.getBRC20List({ start: 0, limit: 20 })
}
```

### Rare Sats Mock → Ordiscan Real
```typescript
// ✅ REAL
import { OrdiscanAPI } from '@/lib/api/ordiscan'

async function getRareSats(address: string) {
  const ordiscan = new OrdiscanAPI(process.env.ORDISCAN_API_KEY!)
  return await ordiscan.getAddressSatributes(address)
}
```

### Market Data Mock → CoinGecko/CMC Real
```typescript
// ✅ REAL com Redis cache
import { redis } from '@/lib/cache/redis'

async function getBitcoinPrice(): Promise<number> {
  const cached = await redis.get('btc:price')
  if (cached) return parseFloat(cached)

  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    { headers: { 'x-cg-pro-api-key': process.env.COINGECKO_API_KEY! } }
  )
  const data = await res.json()
  const price = data.bitcoin.usd

  await redis.setex('btc:price', 30, price.toString())  // 30s cache
  return price
}
```

## Processo de Eliminação

### Por módulo (ordem de prioridade)
1. `src/services/runes/` — P0, dados de mercado são core
2. `src/services/ordinals/` — P0, core feature
3. `src/services/brc20/` — P1
4. `src/services/rare-sats/` — P1
5. `src/components/*/mock*` — P2

### Template de Substituição
```typescript
// Para cada ficheiro com mock data:
// 1. Identificar a estrutura de dados esperada
// 2. Encontrar a API que fornece esses dados
// 3. Criar função async com cache Redis
// 4. Adicionar error handling com fallback
// 5. Remover completamente o mock

// NUNCA:
const data = USE_MOCK ? mockData : await fetchReal()
// → Isto é techdívida — o mock deve desaparecer COMPLETAMENTE
```

## Verificação Final
```bash
# Confirmar que não há mais mock
grep -rn "mock\|MOCK\|fake\|dummy\|placeholder" src/ | grep -v "test\|spec\|__tests__\|\.test\."

# Build deve passar
npm run build

# Type check
npm run type-check
```

## Notas de APIs
- **Hiro API**: `https://api.hiro.so` — free tier disponível, rate limit 1000 req/hr
- **UniSat**: requires API key — `process.env.UNISAT_API_KEY`
- **OrdiscanAPI**: requires API key — `process.env.ORDISCAN_API_KEY`
- **OKX NFT**: substituto Magic Eden — `process.env.OKX_API_KEY`
- **Gamma.io**: público, sem key necessária para reads básicos
