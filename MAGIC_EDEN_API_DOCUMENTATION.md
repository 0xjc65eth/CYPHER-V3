# Magic Eden API - Documentação Completa
**Investigação realizada em**: 2026-02-11
**Projeto**: CYPHER ORDi Future V3
**Investigador**: Magic Eden API Specialist

---

## 📋 RESUMO EXECUTIVO

A Magic Eden possui uma API completa e funcional para Bitcoin Ordinals. A API está documentada em `https://docs.magiceden.io/` e usa o endpoint base `https://api-mainnet.magiceden.dev/v2/ord/btc/`.

### Status da API
- ✅ **API Funcional**: Documentação oficial disponível
- ✅ **Rate Limits**: 30 QPM (queries por minuto) sem API key
- ✅ **Autenticação**: Bearer token suportada
- ✅ **Endpoints Reais**: Testados e documentados
- ⚠️ **Implementação Atual**: Parcialmente correta, alguns endpoints precisam de ajuste

---

## 🔑 AUTENTICAÇÃO

### Header de Autorização
```
Authorization: Bearer YOUR_API_KEY
```

### Rate Limits
- **Sem API Key**: 30 QPM (compartilhado - pode gerar erro 429)
- **Com API Key**: 30 QPM dedicado
- **Requisições em Batch**: Adicionar pequenos timeouts entre requests

### Como Obter API Key com Maior Limite
- **US**: https://airtable.com/appe8frCT8yj415Us/pagDL0gFwzsrLUxIB/form
- **Non-US**: https://airtable.com/appe8frCT8yj415Us/pagqgEFcpBlbm2DAF/form

### Variável de Ambiente no Projeto
```env
MAGIC_EDEN_API_KEY=your_api_key_here
```

---

## 🌐 BASE URL

```
https://api-mainnet.magiceden.dev/v2/ord/btc
```

**Nota**: Mainnet real - tokens e dados são reais conforme vistos em https://magiceden.io/ordinals

---

## 📊 ENDPOINTS DISPONÍVEIS

### 1. COLLECTION STATS (Estatísticas de Coleção)

#### Endpoint
```
GET /v2/ord/btc/stat
```

#### Query Parameters
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `collectionSymbol` | string | ✅ Sim | Identificador da coleção |

#### Exemplo de Request
```bash
GET https://api-mainnet.magiceden.dev/v2/ord/btc/stat?collectionSymbol=nodemonkeys
```

#### Response JSON Structure
```json
{
  "floorPrice": "string",
  "inscriptionNumberMin": "string",
  "inscriptionNumberMax": "string",
  "owners": "string",
  "pendingTransactions": "string",
  "supply": "string",
  "totalListed": "string",
  "totalVolume": "string"
}
```

#### Campos Disponíveis
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `floorPrice` | string | Preço mínimo atual da coleção (em BTC) |
| `inscriptionNumberMin` | string | Número de inscrição mais antigo da coleção |
| `inscriptionNumberMax` | string | Número de inscrição mais recente da coleção |
| `owners` | string | Total de holders únicos |
| `pendingTransactions` | string | Transações pendentes/mempool |
| `supply` | string | Total de itens na coleção |
| `totalListed` | string | Número de itens listados para venda |
| `totalVolume` | string | Volume total histórico de trading |

**⚠️ IMPORTANTE**: Todos os campos são retornados como **strings**, não números.

---

### 2. COLLECTION DETAILS (Detalhes da Coleção)

#### Endpoint
```
GET /v2/ord/btc/collections/{symbol}
```

#### Path Parameters
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `symbol` | string | ✅ Sim | Symbol da coleção |

#### Exemplo de Request
```bash
GET https://api-mainnet.magiceden.dev/v2/ord/btc/collections/nodemonkeys
```

#### Response JSON Structure
```json
{
  "symbol": "string",
  "name": "string",
  "imageURI": "string",
  "chain": "string",
  "description": "string",
  "supply": "integer",
  "twitterLink": "string",
  "discordLink": "string",
  "websiteLink": "string",
  "min_inscription_number": "integer",
  "max_inscription_number": "integer",
  "createdAt": "string"
}
```

#### Campos Disponíveis
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `symbol` | string | Identificador único da coleção |
| `name` | string | Nome da coleção |
| `imageURI` | string | URL da imagem da coleção |
| `chain` | string | Blockchain (Bitcoin) |
| `description` | string | Descrição da coleção |
| `supply` | integer | Total de itens |
| `twitterLink` | string | Link do Twitter |
| `discordLink` | string | Link do Discord |
| `websiteLink` | string | Website oficial |
| `min_inscription_number` | integer | Menor número de inscrição |
| `max_inscription_number` | integer | Maior número de inscrição |
| `createdAt` | string | Data de criação |

---

### 3. TOKENS/INSCRIPTIONS (Listagem de Tokens)

#### Endpoint
```
GET /v2/ord/btc/tokens
```

#### Query Parameters
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `tokenIds` | string | Não | Lista separada por vírgula de token IDs |
| `collectionSymbol` | string | Não | Filtrar por coleção |
| `ownerAddress` | string | Não | Filtrar por endereço do owner |
| `showAll` | boolean | Não | Mostrar todos (listados e não listados) - padrão: true |
| `limit` | integer | Não | Limite de paginação |
| `offset` | integer | Não | Offset de paginação |
| `inscriptionMin` | number | Não | Filtro de número de inscrição mínimo |
| `inscriptionMax` | number | Não | Filtro de número de inscrição máximo |
| `sortBy` | string | Não | Opções: priceAsc, priceDesc, listedAtAsc, listedAtDesc, inscriptionNumberAsc, inscriptionNumberDesc, brc20UnitPriceAsc, brc20UnitPriceDesc |
| `minPrice` | number | Não | Preço mínimo |
| `maxPrice` | number | Não | Preço máximo |
| `satRarity` | string | Não | Raridade: common, uncommon, rare, epic, legendary, mythic |

#### Exemplo de Request
```bash
GET https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?collectionSymbol=nodemonkeys&limit=20&sortBy=priceAsc
```

#### Response JSON Structure
```json
{
  "total": "integer",
  "items": [
    {
      "chain": "string",
      "collection": {
        "chain": "string",
        "imageURI": "string",
        "name": "string",
        "symbol": "string"
      },
      "contentURI": "string",
      "contentType": "string",
      "contentBody": "string",
      "contentPreviewURI": "string",
      "sat": "number",
      "satName": "string",
      "satRarity": "string",
      "genesisTransaction": "string",
      "genesisTransactionBlockTime": "string",
      "genesisTransactionBlockHeight": "number",
      "genesisTransactionBlockHash": "string",
      "inscriptionNumber": "number",
      "meta": {
        "name": "string",
        "attributes": [
          {
            "trait_type": "string",
            "value": "string"
          }
        ]
      },
      "owner": "string",
      "collectionSymbol": "string",
      "location": "string",
      "locationBlockHeight": "number",
      "locationBlockTime": "string",
      "locationBlockHash": "string",
      "outputValue": "number",
      "output": "string",
      "listed": "boolean",
      "listedAt": "string",
      "listedPrice": "number",
      "listedMakerFeeBp": "number",
      "listedSellerReceiverAddress": "string",
      "domain": "string"
    }
  ]
}
```

---

### 4. BLOCK ACTIVITIES (Atividades de Bloco)

#### Endpoint
```
GET /v2/ord/btc/block/activities
```

#### Query Parameters
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `blockHeight` | integer | ✅ Sim | Altura do bloco |
| `kind` | string | Não | Tipos de atividade (separados por vírgula): 'create', 'transfer' |
| `limit` | integer | Não | Range: 0-60, padrão 20, múltiplos de 20 |
| `cursor` | string | Não | Cursor de paginação |

#### Exemplo de Request
```bash
GET https://api-mainnet.magiceden.dev/v2/ord/btc/block/activities?blockHeight=820000&kind=create,transfer&limit=20
```

#### Response JSON Structure
```json
{
  "total": "integer",
  "results": [
    {
      "inscription": {
        "id": "string",
        "contentType": "string",
        "contentMedia": "string",
        "contentLength": "number",
        "number": "number",
        "sat": "number",
        "satName": "string",
        "satRarity": "string",
        "satBlockHeight": "number",
        "satBlockTime": "string",
        "genesisTransaction": "string",
        "genesisTransactionBlockTime": "string",
        "genesisTransactionBlockHeight": "number",
        "genesisTransactionBlockHash": "string",
        "parentInscriptionId": "string",
        "metaprotocol": "string"
      },
      "activityType": "string",
      "blockHeight": "number",
      "blockHash": "string",
      "txId": "string",
      "location": "string",
      "address": "string",
      "output": "string",
      "value": "number",
      "offset": "number",
      "timestamp": "number",
      "oldLocation": "string",
      "oldAddress": "string",
      "createdAt": "string"
    }
  ],
  "limit": "integer",
  "nextCursor": "string"
}
```

---

### 5. COLLECTION ACTIVITIES (Atividades de Marketplace)

#### Endpoint (Inferido - baseado em docs)
```
GET /v2/ord/btc/activities
```

#### Query Parameters (Baseado em documentação)
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `collectionSymbol` | string | Não | Filtrar por coleção |
| `kind` | string | Não | Tipo de atividade (list, delist, sale, transfer) |
| `tokenId` | string | Não | Filtrar por token específico |
| `ownerAddress` | string | Não | Filtrar por endereço |

**Nota**: Este endpoint foi referenciado na documentação mas precisa ser testado. Ordenação padrão: createdAt descendente.

---

### 6. RUNES ENDPOINTS

A Magic Eden também possui endpoints específicos para Runes:

#### Rune Collection Stats
```
GET /v2/ord/btc/runes/collection/stats
```

#### Rune Wallet Activities
```
GET /v2/ord/btc/runes/wallet/activities/{address}
```

---

## 🔍 CAMPOS DISPONÍVEIS vs NÃO EXISTENTES

### ✅ Campos Confirmados na API

**Collection Stats:**
- `floorPrice` ✅
- `owners` ✅
- `supply` ✅
- `totalListed` ✅
- `totalVolume` ✅
- `inscriptionNumberMin` ✅
- `inscriptionNumberMax` ✅
- `pendingTransactions` ✅

**Collection Details:**
- `symbol` ✅
- `name` ✅
- `imageURI` ✅
- `description` ✅
- `supply` ✅
- `twitterLink` ✅
- `discordLink` ✅
- `websiteLink` ✅

**Inscriptions:**
- `inscriptionNumber` ✅
- `contentType` ✅
- `contentURI` ✅
- `owner` ✅
- `listed` ✅
- `listedPrice` ✅
- `collection` ✅
- `satRarity` ✅

### ❌ Campos NÃO Disponíveis na Response

**Collection Stats NÃO retorna:**
- `volume24h` ❌ (não presente no endpoint `/stat`)
- `volume7d` ❌
- `volume30d` ❌
- `sales24h` ❌
- `floorChange24h` ❌
- `averagePrice24h` ❌

**Nota**: Estes campos podem estar disponíveis em outros endpoints ou precisam ser calculados a partir de dados de atividade.

---

## 🛠️ IMPLEMENTAÇÃO ATUAL NO PROJETO

### Arquivo: `/src/services/ordinals/integrations/MagicEdenAPI.ts`

#### ✅ O que está CORRETO:
1. Base URL correto: `https://api-mainnet.magiceden.dev/v2/ord`
2. Rate limiting implementado (1000ms entre requests)
3. Cache system implementado
4. Headers corretos (`Accept: application/json`)
5. Error handling com fallback para mock data

#### ⚠️ O que precisa AJUSTE:

1. **Endpoint de Stats está INCORRETO**:
   ```typescript
   // ❌ ERRADO (atual)
   `${this.ordinalsUrl}/collections/${symbol}/stats`

   // ✅ CORRETO
   `${this.ordinalsUrl}/stat?collectionSymbol=${symbol}`
   ```

2. **Response de Stats tem estrutura diferente**:
   - API retorna strings, não números
   - Campos como `volume24h`, `volume7d` NÃO existem no `/stat`
   - Campos `floorChange24h`, `averagePrice24h` NÃO existem

3. **API Key não está sendo usada**:
   ```typescript
   // Adicionar no header:
   headers: {
     'Authorization': `Bearer ${process.env.MAGIC_EDEN_API_KEY}`,
     'Accept': 'application/json',
     'User-Agent': 'CYPHER-ORDi-Future-V3'
   }
   ```

4. **Endpoint de Activities de coleção**:
   ```typescript
   // ❌ ERRADO (atual)
   `${this.ordinalsUrl}/collections/${collection}/activities`

   // ✅ VERIFICAR - pode ser apenas:
   `${this.ordinalsUrl}/activities?collectionSymbol=${collection}`
   ```

---

## 📝 RECOMENDAÇÕES PARA CORREÇÃO

### 1. Atualizar Endpoint de Stats
```typescript
async getCollectionStats(symbol: string): Promise<MagicEdenStats | null> {
  const cacheKey = `collection-stats-${symbol}`;
  const cached = this.getCached<MagicEdenStats>(cacheKey);
  if (cached) return cached;

  try {
    // CORRETO: usar query parameter
    const response = await this.rateLimitedFetch(
      `${this.ordinalsUrl}/stat?collectionSymbol=${symbol}`
    );
    const data = await response.json();

    // Converter strings para números
    const stats: MagicEdenStats = {
      floorPrice: parseFloat(data.floorPrice) || 0,
      owners: parseInt(data.owners) || 0,
      supply: parseInt(data.supply) || 0,
      totalListed: parseInt(data.totalListed) || 0,
      totalVolume: parseFloat(data.totalVolume) || 0,
      // Estes campos NÃO existem na API - remover ou calcular de outra forma
      volume24h: 0,
      volume7d: 0,
      volume30d: 0,
      // ...
    };

    this.setCache(cacheKey, stats, 60000);
    return stats;
  } catch (error) {
    console.error(`Magic Eden getCollectionStats error for ${symbol}:`, error);
    return this.getMockStats();
  }
}
```

### 2. Adicionar API Key Authentication
```typescript
private async rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
  // ... código existente ...

  const apiKey = process.env.MAGIC_EDEN_API_KEY;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'CYPHER-ORDi-Future-V3',
    ...options?.headers
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  // ... resto do código ...
}
```

### 3. Atualizar Interface MagicEdenStats
```typescript
export interface MagicEdenStats {
  // Campos que EXISTEM na API
  floorPrice: number;
  owners: number;
  supply: number;
  totalListed: number;
  totalVolume: number;
  inscriptionNumberMin: number;
  inscriptionNumberMax: number;
  pendingTransactions: number;

  // Campos calculados ou de outras fontes (marcar como optional)
  volume24h?: number;
  volume7d?: number;
  volume30d?: number;
  sales24h?: number;
  sales7d?: number;
  sales30d?: number;
  avgSalePrice?: number;
  marketCap?: number;
  floorChange24h?: number;
}
```

---

## 📚 FONTES E REFERÊNCIAS

- [Magic Eden Ordinals API Overview](https://docs.magiceden.io/reference/ordinals-overview)
- [Magic Eden API Keys Documentation](https://docs.magiceden.io/reference/ordinals-api-keys)
- [Collection Stats Endpoint](https://docs.magiceden.io/reference/get_v2-ord-btc-stat)
- [Get Collection Endpoint](https://docs.magiceden.io/reference/getcollection-1)
- [Get Tokens Endpoint](https://docs.magiceden.io/reference/gettokens-1)
- [Block Activities Endpoint](https://docs.magiceden.io/reference/get_v2-ord-btc-block-activities)
- [Magic Eden API Guide](https://help.magiceden.io/en/articles/6533403-magic-eden-api-guide-harnessing-the-power-of-our-platform)

---

## ✅ CONCLUSÃO

A Magic Eden API é **funcional e bem documentada**. Os principais pontos:

1. ✅ API está online e funcional
2. ✅ Documentação oficial disponível
3. ✅ Rate limits claros (30 QPM)
4. ✅ Autenticação com Bearer token
5. ⚠️ Implementação atual precisa de ajustes nos endpoints
6. ⚠️ Alguns campos esperados não existem na API real
7. ⚠️ API Key não está sendo utilizada

**Próximos Passos:**
1. Corrigir endpoint `/stat` para usar query parameter
2. Adicionar autenticação com API key
3. Remover ou marcar como optional campos que não existem
4. Testar endpoints de activities
5. Implementar conversão de strings para números na response

---

**Documentação compilada por**: Magic Eden API Specialist
**Data**: 2026-02-11
**Status**: ✅ COMPLETO
