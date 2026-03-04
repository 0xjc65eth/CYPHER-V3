---
name: feature-validator
description: Valida cada feature do CYPHER V3 end-to-end — não só "compila" mas "funciona para o utilizador com dados reais em condições reais"
version: "4.0"
tags: [features, e2e, validation, real-conditions, functional-testing]
---

# SKILL: Feature Validator — CYPHER V3

## Filosofia
Uma feature está "feita" quando um trader real consegue usá-la sem ajuda, com dados reais, e obtém valor. Não quando o código compila.

---

## Inventário de Features e Como Validar Cada Uma

### FEATURE 1: Dashboard Principal
**O que deve fazer:** Mostrar visão geral do mercado Bitcoin em tempo real

**Validação:**
```
✅ BTC price visível e real (não $0, não $95,000.00 sempre igual)
✅ Variação 24h com sinal correto (+ verde, - vermelho)
✅ Fear & Greed Index atual (número 0-100 + label)
✅ Bitcoin dominance (%)
✅ Total market cap
✅ Fees atuais (sat/vB) — muda ao longo do dia
✅ Preço atualiza sem reload da página (< 60s)
✅ Gráfico de preço mostra dados históricos reais
```

**Como testar:**
1. Abrir a página às 10:00
2. Anotar o preço do BTC
3. Voltar às 10:05
4. O preço mudou? (mercado quase sempre se move)
5. A variação 24h faz sentido com o movimento?

**Red flags:**
- Preço sempre exatamente igual em visitas diferentes
- Variação 24h sempre +2.5% ou qualquer valor fixo
- Gráfico com linha plana ou dados de 2023

---

### FEATURE 2: Módulo Ordinals
**O que deve fazer:** Analytics completo do mercado de Ordinals

**Validação:**
```
✅ Top coleções por volume — dados Hiro API reais
✅ Floor price em BTC com 4+ casas decimais (ex: 0.0432 BTC)
✅ Volume 24h em BTC — muda entre dias
✅ Imagens das coleções carregam (não broken)
✅ Click numa coleção → abre detalhes reais
✅ Inscriptions de um endereço → mostra as inscrições reais
✅ Trending → coleções com maior movimento nas últimas 24h
✅ Filtros funcionam (por preço, volume, mudança)
✅ Paginação funciona (próxima página carrega mais itens)
```

**Teste de regressão:**
```bash
# Coleção de referência para confirmar dados reais
# NodeMonkes tem floor histórico documentado
curl -sf "http://localhost:4444/api/ordinals/collections/nodemonkes" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))
const floor = d.floorPrice || d.floor_price || d.data?.floorPrice
console.log(floor && floor > 0 ? '✅ NodeMonkes floor: ' + floor + ' BTC' : '❌ Floor inválido: ' + floor)
"
```

---

### FEATURE 3: Módulo Runes
**O que deve fazer:** Market data completo para Bitcoin Runes (BIP-420)

**Validação:**
```
✅ Lista de Runes com nomes no formato WORD•WORD
✅ Preço em sats — número inteiro positivo
✅ Market cap = price × supply (calculado corretamente)
✅ Volume 24h em BTC
✅ Número de holders — integer positivo
✅ Supply total — número grande (bigint como string)
✅ Pesquisa por nome funciona
✅ Ordem por market cap/volume/price funciona
✅ Click num Rune → detalhes completos (etchings, mint, holders)
```

**Verificar cálculo de market cap:**
```typescript
// market cap = (price_in_sats / 1e8) * total_supply
// Para verificar: se price = 1000 sats e supply = 1,000,000,000
// market cap = (1000/100000000) * 1000000000 = 10,000 BTC
// Em USD: 10,000 BTC * $95,000 = $950,000,000 (~$950M)
// Confirmar que o número mostrado é plausível
```

---

### FEATURE 4: Rare Sats
**O que deve fazer:** Identificar e valorizar satoshis raros num endereço

**Validação:**
```
✅ 9 categorias principais visíveis: Uncommon, Rare, Epic, Legendary, Mythic, Vintage, Black Uncommon, Pizza Sat, Palindrome
✅ Contagem real por categoria para o endereço testado
✅ Valor estimado em BTC por categoria
✅ Cada sat mostra: número ordinal, satributo, inscrições (se existirem)
✅ Scan de endereço funciona (não só demo estático)
✅ Resultado diferente para endereços diferentes (não hardcoded)
```

**Testar com endereço real:**
```bash
# Endereço público com Rare Sats documentados (para teste)
TEST_ADDR="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"  # endereço de exemplo

curl -sf "http://localhost:4444/api/rare-sats/address/$TEST_ADDR" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))
const cats = d.categories || d.data?.categories || {}
const total = Object.values(cats).reduce((a,b) => a + (b?.count || 0), 0)
console.log(total > 0 ? '✅ Rare Sats encontrados: ' + total : '⚠️ Zero rare sats (pode ser correto ou pode ser erro)')
console.log('Categorias:', JSON.stringify(cats, null, 2))
"
```

---

### FEATURE 5: Portfolio / Wallet
**O que deve fazer:** Mostrar os assets reais do utilizador após conectar wallet

**Validação:**
```
✅ Connect Wallet button funciona (LaserEyes — Xverse, UniSat, OYL)
✅ Após conectar: endereço Bitcoin visível
✅ Balanço BTC real (não 0.00000000 a não ser que seja mesmo 0)
✅ Ordinals do endereço listadas com imagens
✅ Runes do endereço com quantidades reais
✅ BRC-20 tokens se existirem
✅ Rare Sats count
✅ P&L (se histórico disponível)
✅ Disconnect funciona e limpa o estado
```

**Verificar que estado limpa ao desconectar:**
```typescript
// Anti-pattern comum: estado persiste após disconnect
// O agente deve verificar:
// 1. Conectar wallet → ver dados
// 2. Desconectar → localStorage/sessionStorage deve estar limpo
// 3. Recarregar → não deve mostrar dados da wallet anterior
```

---

### FEATURE 6: Trading Agent (Hacker Yields)
**O que deve fazer:** Agente autónomo de trading com Hyperliquid

**Validação:**
```
✅ Estado do agente visível: Active / Paused / Stopped
✅ Logs de decisões legíveis e recentes (não de ontem)
✅ Posições abertas mostram símbolo, tamanho, P&L real
✅ P&L atualiza em tempo real com o preço
✅ Start/Stop/Pause funcionam
✅ Estratégia ativa visível (Scalping, MarketMaker, etc.)
✅ Risk metrics: drawdown atual, posições abertas, margem usada
✅ Histórico de trades (não vazio se já executou)
```

---

### FEATURE 7: Alertas de Preço
**O que deve fazer:** Notificar quando preço/floor atingir threshold

**Validação:**
```
✅ Criar alerta: ativo → funciona
✅ Listar alertas ativos
✅ Quando condição se cumpre → notificação browser
✅ Alerta marca como triggered e não notifica repetidamente
✅ Eliminar alerta funciona
✅ Alertas persistem após refresh (Supabase)
```

---

## Matriz de Prioridade de Features

| Feature | Impacto no Utilizador | Complexidade de Fix | Prioridade |
|---------|----------------------|--------------------|---------| 
| BTC Price real-time | 🔴 Crítico | Baixa | P0 |
| Ordinals dados reais | 🔴 Crítico | Média | P0 |
| Runes dados reais | 🔴 Crítico | Média | P0 |
| Connect Wallet | 🔴 Crítico | Alta | P0 |
| Rare Sats scan | 🟡 Alto | Média | P1 |
| Portfolio P&L | 🟡 Alto | Alta | P1 |
| Trading Agent UI | 🟡 Alto | Média | P1 |
| Alertas de preço | 🟢 Médio | Média | P2 |
| Exportar dados | 🟢 Médio | Baixa | P2 |

## Relatório de Feature Validation
```
## Feature Validation Report — CYPHER V3
**Data:** [timestamp]
**Testado com dados reais:** Sim/Não

### Feature: [nome]
**Status:** ✅ Funcional / ⚠️ Parcial / ❌ Quebrado
**Utilizador consegue atingir objetivo:** Sim / Não / Com dificuldade

**Passos testados:**
1. [ação] → [resultado]
2. [ação] → [resultado]

**Problemas encontrados:**
- [problema] → [fix necessário] → [prioridade]

**Score de qualidade: X/10**
```
