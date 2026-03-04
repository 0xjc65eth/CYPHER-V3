---
name: user-journey
description: Simula jornadas de utilizadores reais no CYPHER V3 — identifica fricção, confusão e pontos de abandono
version: "2.0"
tags: [ux, user-journey, personas, friction, onboarding]
---

# SKILL: User Journey — CYPHER V3

## Princípio: Cada persona tem um objetivo — consegue atingi-lo sem ajuda?
Não testamos "o botão funciona", testamos "o trader consegue fazer o que veio fazer".

## 4 Personas de Teste

### Persona 1: 🆕 Novo Utilizador (João, 28, curioso sobre crypto)
**Objetivo:** Perceber o que é o CYPHER V3 em 10 segundos
**Jornada:**
1. Abre o site pela primeira vez
   - [ ] Carrega em < 3 segundos?
   - [ ] Percebe o que é a plataforma imediatamente?
   - [ ] Vê preço do BTC sem precisar de fazer nada?
2. Explora o dashboard
   - [ ] Informação organizada e legível?
   - [ ] Cores fazem sentido (verde=bom, vermelho=mau)?
   - [ ] Sem jargão inexplicado?
3. Clica numa aba (Ordinals, Runes)
   - [ ] Dados carregam rapidamente?
   - [ ] Percebe o que está a ver?
4. Tenta conectar wallet
   - [ ] Botão de connect visível e claro?
   - [ ] Popup de wallet funciona?
   - [ ] Se não tem wallet: mensagem útil?

**Critério de sucesso:** Depois de 60 segundos, consegue explicar o que o CYPHER V3 faz.

### Persona 2: 📊 Trader de Ordinals (Maria, 35, coleciona NFTs Bitcoin)
**Objetivo:** Encontrar coleções trending e comparar floor prices
**Jornada:**
1. Navega para módulo Ordinals
   - [ ] Top coleções visíveis por volume?
   - [ ] Floor prices em BTC com 4+ decimais?
   - [ ] Volume 24h muda entre dias?
2. Clica numa coleção
   - [ ] Detalhes reais (supply, holders, volume)?
   - [ ] Imagens dos inscriptions carregam?
   - [ ] Histórico de preço disponível?
3. Pesquisa uma coleção específica
   - [ ] Search funciona?
   - [ ] Resultados relevantes?
4. Quer comprar
   - [ ] Vê onde comprar (link para marketplace)?
   - [ ] Preço atual claro?

**Critério de sucesso:** Em 2 minutos, encontra e compara 3 coleções com dados reais.

### Persona 3: ⚡ Trader de Runes (Pedro, 42, trader ativo)
**Objetivo:** Encontrar Runes com volume crescente para trading
**Jornada:**
1. Navega para módulo Runes
   - [ ] Lista com nomes formato WORD•WORD?
   - [ ] Preço em sats é número positivo?
   - [ ] Market cap = preço × supply (verificável)?
   - [ ] Volume 24h muda entre consultas?
2. Ordena por volume/preço/market cap
   - [ ] Sorting funciona?
   - [ ] Dados atualizam ao reordenar?
3. Clica num Rune específico
   - [ ] Detalhes: supply, holders, etchings?
   - [ ] Supply como bigint string (não number overflow)?
4. Quer ver o seu portfólio de Runes
   - [ ] Conecta wallet
   - [ ] Runes holdings aparecem?
   - [ ] Quantidades corretas?

**Critério de sucesso:** Em 3 minutos, identifica 3 Runes com volume crescente.

### Persona 4: 💼 Holder com Wallet (Ana, 30, HODLer)
**Objetivo:** Ver o valor total do seu portfólio Bitcoin + Ordinals + Runes
**Jornada:**
1. Conecta wallet
   - [ ] LaserEyes: Xverse/UniSat/OYL funcionam?
   - [ ] Endereço visível após connect?
2. Vê portfólio
   - [ ] BTC balance real (não mock)?
   - [ ] Ordinals listados com imagens?
   - [ ] Runes com quantidades?
   - [ ] BRC-20 se existirem?
   - [ ] Rare Sats contados?
3. Vê P&L
   - [ ] Se disponível: valor total em USD?
   - [ ] Mudança 24h com cor (verde/vermelho)?
4. Desconecta
   - [ ] Botão de disconnect funciona?
   - [ ] Estado limpo (sem dados residuais)?

**Critério de sucesso:** Em 1 minuto após connect, vê o valor total do portfólio.

## Como Testar Cada Persona

```bash
# Verificar se os endpoints necessários respondem
echo "=== Endpoints para personas ==="

# Persona 1: Dashboard
curl -sf http://localhost:4444/api/market/bitcoin > /dev/null && echo "✅ BTC price" || echo "❌ BTC price"
curl -sf http://localhost:4444/api/market/overview > /dev/null && echo "✅ Market overview" || echo "❌ Market overview"

# Persona 2: Ordinals
curl -sf "http://localhost:4444/api/ordinals/collections?limit=10" > /dev/null && echo "✅ Ordinals collections" || echo "❌ Ordinals collections"
curl -sf "http://localhost:4444/api/ordinals/trending" > /dev/null && echo "✅ Ordinals trending" || echo "❌ Ordinals trending"

# Persona 3: Runes
curl -sf "http://localhost:4444/api/runes/market?limit=10" > /dev/null && echo "✅ Runes market" || echo "❌ Runes market"
curl -sf "http://localhost:4444/api/runes/trending" > /dev/null && echo "✅ Runes trending" || echo "❌ Runes trending"

# Persona 4: Portfolio
curl -sf "http://localhost:4444/api/rare-sats/categories" > /dev/null && echo "✅ Rare sats" || echo "❌ Rare sats"
```

## Pontos de Fricção Comuns
- Loading > 3s sem skeleton → utilizador pensa que está partido
- Dados sem timestamp → utilizador não sabe se é atual
- Erro sem mensagem útil → utilizador não sabe o que fazer
- Botão sem feedback → utilizador clica múltiplas vezes
- Wallet connect falha silenciosamente → utilizador confuso
- Preço sem moeda ($, BTC, sats) → utilizador interpreta mal

## Relatório User Journey
```
## User Journey Report — CYPHER V3
**Persona testada:** [nome]
**Objetivo:** [objetivo]
**Resultado:** ✅ Conseguiu / ❌ Não conseguiu / ⚠️ Com dificuldade

### Fricções Encontradas
1. [passo]: [problema] → [fix sugerido] (P0/P1/P2)

### Tempo para Objetivo
- Esperado: Xmin
- Real: Xmin

### Score de Experiência: X/10
```
