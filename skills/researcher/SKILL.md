---
name: researcher
description: Pesquisa sobre mercado crypto, APIs alternativas, tecnologias emergentes e oportunidades para o CYPHER V3
version: "2.0"
tags: [research, crypto, bitcoin, ordinals, runes, market-data, apis]
---

# SKILL: Researcher — CYPHER V3

## Princípio: PESQUISAR ANTES DE PROPOR
NUNCA sugerir features ou integrações sem primeiro verificar:
1. A API/serviço ainda existe e está ativo?
2. Qual é o estado atual (deprecado, beta, estável, pagamento)?
3. Existem alternativas melhores?
4. Qual é o custo real de integração?

## Contexto de Pesquisa Atual

### Magic Eden — SITUAÇÃO CRÍTICA
**Status:** A abandonar suporte a Ordinals e Runes
**Impacto no CYPHER V3:** Módulos que dependem de Magic Eden vão quebrar
**Ação:** Migrar para:
1. **OKX NFT API** — suporte ativo a Ordinals/Runes, docs completos
2. **Gamma.io** — marketplace alternativo, API pública
3. **Hiro Systems** — indexer oficial Bitcoin/Ordinals, open source

**Pesquisa de migração:**
```
Queries a fazer:
- "OKX NFT API Ordinals documentation 2025"
- "Gamma.io API Bitcoin Ordinals"
- "Hiro API Ordinals collections endpoints"
- "Magic Eden deprecation Ordinals alternative"
```

### APIs a Investigar Regularmente

#### Ordinals & Runes
```
Hiro: https://docs.hiro.so/bitcoin/ordinals
OrdiscanL https://ordiscan.com/docs
UniSat: https://open-api.unisat.io
OKX NFT: https://www.okx.com/web3/build/docs/waas/nft-get-inscriptions
Gamma.io: https://gamma.io/developers
```

#### Market Data
```
CoinGecko Pro: https://www.coingecko.com/en/api/documentation
CoinMarketCap: https://coinmarketcap.com/api/documentation
Glassnode: https://docs.glassnode.com
Messari: https://messari.io/api
```

#### Bitcoin Infrastructure
```
Mempool.space: https://mempool.space/api
Blockstream: https://blockstream.info/api
Bitquery: https://docs.bitquery.io
```

## Áreas de Pesquisa Proativa

### 1. Bitcoin Runes Protocol
**O que monitorar:**
- Novos launches de Runes (raro/valioso = oportunidade)
- Floor price changes em Runes populares
- Minting windows
- Liquidity pools em DEXes para Runes

**Queries de pesquisa:**
```
"Bitcoin Runes protocol new launch 2025"
"Runes protocol analytics dashboard"
"top Runes by volume 2025"
```

### 2. Bitcoin Ordinals Ecosystem
**Status atual:**
- Magic Eden saindo → nova oportunidade para CYPHER V3 se tornar referência
- Ordinals volume histórico disponível via Hiro
- Rare Sats: mercado nicho mas crescente (sat hunters)

### 3. Bitcoin Layer 2 e DeFi
**Monitorar para features futuras:**
- Lightning Network integrations
- Stacks (sBTC) — Bitcoin DeFi
- Merlin Chain, B² Network — Bitcoin L2
- Babylon Protocol — Bitcoin staking

### 4. Trading Infraestrutura
**Hyperliquid:**
- Verificar updates de API regularmente
- Novos pairs disponíveis
- Fee tier changes

**CCXT Updates:**
- `npm outdated ccxt` — nova versão tem novos exchanges?
- Exchanges removidos?

## Formato de Research Report

### Antes de Sugerir uma Feature
```markdown
## Research: [Feature Name]

### Viabilidade Técnica
- API disponível: ✅/❌ + link
- Custo: free/paid/usage-based
- Rate limits: X req/min
- Estabilidade: alpha/beta/stable
- Última atualização: [data]

### Concorrência
- Quem já tem esta feature?
- Como o CYPHER V3 pode diferenciá-la?

### Estimativa de Implementação
- Complexidade: baixa/média/alta
- Ficheiros afetados: [lista]
- Dependências novas: [lista]

### Recomendação
✅ Implementar agora / 🟡 Sprint seguinte / ❌ Não justifica
```

## Queries de Web Search para Usar
```bash
# Sempre incluir ano para resultados recentes
"[tecnologia] API 2025 documentation"
"[feature] Bitcoin Ordinals implementation"
"[library] changelog breaking changes 2025"
"Magic Eden ordinals deprecation alternative"
"OKX NFT API Bitcoin Runes endpoint"
```

## Red Flags em APIs Crypto
- Sem data de última atualização nos docs
- Issues no GitHub sem resposta > 30 dias
- Discord/Telegram server inativo
- Rate limits não documentados
- Sem SLA ou uptime history
- Changelog com "BREAKING CHANGES" recentes sem migration guide
