---
name: real-data-auditor
description: Garante que ZERO dados simulados existem no CYPHER V3 — cada número visível vem de uma API real
version: "2.0"
tags: [audit, real-data, mock-elimination, api-validation]
---

# SKILL: Real Data Auditor — CYPHER V3

## Princípio: ZERO TOLERÂNCIA para dados simulados
Se um trader vê um preço de $95,000 no CYPHER V3, esse número TEM de ser real.
Não pode ser Math.random(), não pode ser um array hardcoded, não pode ser um "placeholder".

## Scan Completo de Dados Simulados

### Camada 1: Mock Data Explícito
```bash
echo "=== mockData / MOCK_DATA / isMock ==="
grep -rn "mockData\|MOCK_DATA\|mock_data\|isMock\|useMock\|USE_MOCK\|MOCK_MODE" \
  src/ --include="*.ts" --include="*.tsx" | grep -v "test\|spec\|__tests__\|\.test\."

echo ""
echo "=== Condicionais mock/real (PROIBIDO) ==="
grep -rn "USE_MOCK\s*?\|isMock\s*?\|MOCK_MODE\s*?" src/ --include="*.ts" --include="*.tsx"
# Padrão proibido: USE_MOCK ? mockData : fetchReal()
# O mock DEVE desaparecer completamente — sem condicionais
```

### Camada 2: Dados Aleatórios em Produção
```bash
echo "=== Math.random em dados de produção ==="
grep -rn "Math\.random()" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "test\|spec\|__tests__\|crypto\|uuid\|id\|key"
# Math.random() para gerar IDs é ok
# Math.random() para gerar preços/volumes/counts é PROIBIDO
```

### Camada 3: Arrays Hardcoded Suspeitos
```bash
echo "=== Arrays com dados hardcoded ==="
grep -rn "const.*=\s*\[" src/ --include="*.ts" --include="*.tsx" | \
  grep -i "price\|volume\|floor\|market\|collection\|rune\|ordinal\|token" | \
  grep -v "type\|interface\|import\|test\|key\|route\|column\|header"
```

### Camada 4: Placeholders e Defaults Suspeitos
```bash
echo "=== Valores placeholder ==="
grep -rn "0\.05000\|1\.00000\|100\.00\|12345\|99999" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "test\|constant\|config\|limit\|max\|min"

echo ""
echo "=== Strings placeholder ==="
grep -rn "'Loading\.\.\.\|TBD\|Coming Soon\|N/A\|placeholder\|dummy\|sample\|example" \
  src/components/ --include="*.tsx" | grep -v "test\|comment\|alt="
```

### Camada 5: Validação de API Responses
```bash
echo "=== Fetches sem Zod validation ==="
grep -rn "await.*\.json()" src/app/api/ --include="*.ts" | \
  grep -v "parse\|safeParse\|validate\|schema\|Schema"
# Cada API route DEVE validar o response com Zod antes de retornar ao cliente
```

## Mapa de Substituições

| Dado Mock | API Real | Endpoint | TTL Cache |
|-----------|----------|----------|-----------|
| Ordinals collections | Hiro | `/ordinals/v1/collections` | 60s |
| Ordinals floor price | Hiro | `/ordinals/v1/collections/{id}` | 60s |
| Runes market | Hiro Runehook | `/runes/v1/etchings` | 60s |
| Rune details | Hiro | `/runes/v1/etchings/{name}` | 120s |
| BRC-20 tokens | UniSat | `/v1/indexer/brc20/list` | 120s |
| BTC price | CoinGecko | `/api/v3/simple/price?ids=bitcoin` | 15s |
| Market overview | CoinGecko | `/api/v3/global` | 60s |
| Bitcoin fees | Mempool | `/api/v1/fees/recommended` | 30s |
| Rare Sats | Ordiscan | `/v1/rare-sats` | 300s |

## Regra Absoluta
```
NUNCA isto:
  const data = USE_MOCK ? mockData : await fetchReal()

SEMPRE isto:
  const data = await fetchReal() // mock eliminado, não comentado
```

## Relatório de Auditoria de Dados
```
## Auditoria de Dados Reais — CYPHER V3
**Data:** [timestamp]

### 📊 Resumo
- Ficheiros com mock data: N
- Math.random() em produção: N
- Arrays hardcoded: N
- APIs sem Zod: N
- Score: X/100

### 🔴 Mock Data Encontrado
- [ficheiro:linha] → [tipo] → [API real a usar]

### ✅ Dados Confirmados Reais
- BTC price: $X (source: CoinGecko)
- Ordinals: N coleções (source: Hiro)
- Runes: N tokens (source: Hiro Runehook)
```
