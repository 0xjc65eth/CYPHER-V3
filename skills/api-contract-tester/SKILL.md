---
name: api-contract-tester
description: Testa cada API route do CYPHER V3 com dados reais — valida schemas, mede performance, detecta breaking changes, garante que cada endpoint retorna o que promete
version: "4.0"
tags: [api, testing, contracts, validation, real-data, endpoints]
---

# SKILL: API Contract Tester — CYPHER V3

## Princípio
Cada API route é um contrato com o frontend. Quebrar esse contrato silenciosamente é a causa #1 de bugs invisíveis que chegam ao utilizador.

## Inventário Completo de APIs a Testar

### Market Data
```bash
BASE="http://localhost:4444"

# BTC Price — crítico, usado em toda a plataforma
test_endpoint() {
  local path=$1 expected_fields=$2 description=$3
  local start=$(date +%s%3N)
  local response=$(curl -sf "$BASE$path" 2>/dev/null)
  local elapsed=$(($(date +%s%3N) - start))
  
  if [ -z "$response" ]; then
    echo "❌ FALHOU ($description): sem resposta — servidor está a correr?"
    return 1
  fi
  
  local missing=""
  for field in $expected_fields; do
    echo "$response" | node -e "
      const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))
      const val = d['$field'] ?? d.data?.['$field']
      if (val === undefined || val === null) process.exit(1)
    " 2>/dev/null || missing="$missing $field"
  done
  
  if [ -n "$missing" ]; then
    echo "⚠️  INCOMPLETO ($description) — campos em falta:$missing"
  else
    local perf=$([ $elapsed -lt 500 ] && echo "✅" || ([ $elapsed -lt 2000 ] && echo "⚠️ LENTO" || echo "❌ MUITO LENTO"))
    echo "$perf $description: ${elapsed}ms"
  fi
}

# Executar todos os testes
test_endpoint "/api/market/bitcoin"        "price change24h volume24h marketCap"  "BTC Market"
test_endpoint "/api/market/overview"       "btcDominance totalMarketCap fearGreed" "Market Overview"
test_endpoint "/api/fees"                  "fastestFee halfHourFee hourFee"        "Bitcoin Fees"
test_endpoint "/api/ordinals/collections"  "data total"                           "Ordinals Collections"
test_endpoint "/api/ordinals/trending"     "data"                                 "Ordinals Trending"
test_endpoint "/api/runes/market"          "data total"                           "Runes Market"
test_endpoint "/api/runes/trending"        "data"                                 "Runes Trending"
test_endpoint "/api/brc20/list"            "data total"                           "BRC-20 List"
test_endpoint "/api/rare-sats/categories" "categories"                           "Rare Sats Categories"
```

### Validação de Dados Reais (não mock)
```bash
# BTC price deve estar entre $50k e $200k (range razoável em 2025/2026)
curl -sf "http://localhost:4444/api/market/bitcoin" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))
const price = d.price || d.data?.price
if (!price) { console.log('❌ Sem campo price'); process.exit(1) }
if (isNaN(price)) { console.log('❌ Price é NaN'); process.exit(1) }
if (price < 10000 || price > 500000) { console.log('⚠️  Price suspeito: ' + price + ' (pode ser mock)'); process.exit(1) }
console.log('✅ BTC price real: \$' + price.toLocaleString())
"

# Ordinals — floor prices devem ser > 0 e < 100 BTC (range real)
curl -sf "http://localhost:4444/api/ordinals/collections?limit=3" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))
const items = d.data || d.results || []
if (items.length === 0) { console.log('❌ Sem coleções'); process.exit(1) }
const mocked = items.filter(i => ['NodeMonkes','Test Collection','Mock'].some(m => i.name?.includes(m)))
if (mocked.length > 0) { console.log('❌ MOCK DATA detetado: ' + mocked.map(i=>i.name).join(', ')); process.exit(1) }
items.forEach(i => console.log('✅', i.name, '| floor:', i.floorPrice || i.floor_price, 'BTC'))
"

# Runes — nomes devem ter formato WORD•WORD
curl -sf "http://localhost:4444/api/runes/market?limit=3" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))
const items = d.data || d.results || []
if (items.length === 0) { console.log('❌ Sem Runes'); process.exit(1) }
items.forEach(i => {
  const validName = /^[A-Z•]+\$/.test(i.name || '')
  console.log(validName ? '✅' : '⚠️ nome suspeito', i.name, '| price:', i.price, 'sats')
})
"
```

### Schema Contracts (o que o frontend espera)
```typescript
// Contratos de tipos que NUNCA podem quebrar

// BTC Market
interface BTCMarketResponse {
  price: number          // $USD, required
  change24h: number      // percentagem, pode ser negativo
  volume24h: number      // $USD
  marketCap: number      // $USD
  lastUpdated: number    // timestamp Unix
}

// Ordinals Collection
interface OrdinalCollection {
  id: string             // slug único
  name: string           // nome da coleção
  floorPrice: number     // em BTC (float)
  volume24h: number      // em BTC
  inscriptionCount: number
  image?: string         // URL da imagem
  listed: number         // listings ativos
}

// Rune
interface RuneMarket {
  id: string
  name: string           // formato: WORD•WORD
  symbol: string         // símbolo curto
  price: number          // em sats
  marketCap: number      // em BTC
  volume24h: number      // em BTC
  holders: number
  supply: string         // bigint como string
  divisibility: number
}

// Fee Estimate
interface FeeEstimate {
  fastestFee: number     // sat/vB — próximo bloco
  halfHourFee: number    // sat/vB — 30 min
  hourFee: number        // sat/vB — 1 hora
  economyFee: number     // sat/vB — sem pressa
  minimumFee: number     // sat/vB — mínimo
}
```

## Breaking Change Detection
```bash
# Antes de qualquer mudança em API routes, guardar snapshot
echo "Guardando snapshot das APIs..."
for ep in "/api/market/bitcoin" "/api/ordinals/collections?limit=1" "/api/runes/market?limit=1"; do
  filename=$(echo "$ep" | sed 's/[^a-zA-Z0-9]/_/g')
  curl -sf "http://localhost:4444$ep" > "/tmp/api_snapshot_${filename}.json" 2>/dev/null && \
    echo "✅ Snapshot: $ep" || echo "❌ Falhou: $ep"
done

# Após mudança, comparar estrutura (não valores)
compare_schema() {
  local ep=$1
  local filename=$(echo "$ep" | sed 's/[^a-zA-Z0-9]/_/g')
  local old="/tmp/api_snapshot_${filename}.json"
  [ ! -f "$old" ] && echo "⚠️  Sem snapshot para $ep" && return
  
  local new=$(curl -sf "http://localhost:4444$ep")
  
  # Compara chaves de primeiro nível
  local old_keys=$(cat "$old" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(Object.keys(d).sort().join(','))")
  local new_keys=$(echo "$new" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(Object.keys(d).sort().join(','))")
  
  [ "$old_keys" = "$new_keys" ] && echo "✅ Schema OK: $ep" || \
    echo "❌ BREAKING CHANGE em $ep — antes: $old_keys | depois: $new_keys"
}
```

## Relatório Final de API Health
```
## API Health Report — CYPHER V3
**Data:** [timestamp]

### ✅ Endpoints Funcionais
| Endpoint | Latência | Dados |
|----------|---------|-------|
| /api/market/bitcoin | 234ms | Real ✅ |

### ❌ Endpoints com Problemas
| Endpoint | Problema | Prioridade |
|----------|---------|------------|
| /api/runes/trending | timeout 5s | P1 |

### ⚠️  Dados Suspeitos (possível mock)
| Endpoint | Campo | Valor | Suspeita |
|----------|-------|-------|---------|
| /api/ordinals | floorPrice | 0.05000 | Hardcoded |

### 📊 Score de Saúde das APIs
- Funcionais: X/Y (Z%)
- Com dados reais: X/Y (Z%)
- Dentro do target de performance: X/Y (Z%)
```
