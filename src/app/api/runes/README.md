# Hiro Runes API Integration

Esta documentação descreve as 4 rotas API Next.js implementadas para integração com a Hiro Runes API.

## Configuração

- **API Key**: Set via `HIRO_API_KEY` environment variable
- **Base URL**: `https://api.hiro.so/runes/v1/`
- **Headers**: `X-API-Key`
- **Cache**: 1-5 minutos dependendo da volatilidade dos dados
- **Rate Limiting**: 60-100 requests por minuto

## Rotas Implementadas

### 1. `/api/runes/etchings` - Listar Todos os Runes

Lista todos os runes disponíveis com informações detalhadas.

**Método**: `GET`

**Parâmetros de Query**:
- `limit`: Número de resultados (1-1000, padrão: 100)
- `offset`: Deslocamento para paginação (padrão: 0)
- `order`: Ordem dos resultados (`asc` ou `desc`, padrão: `desc`)
- `order_by`: Campo para ordenação (`timestamp`, `symbol`, `total_supply`, `holders`, padrão: `timestamp`)

**Exemplo de Uso**:
```javascript
// Buscar os primeiros 50 runes ordenados por timestamp
fetch('/api/runes/etchings?limit=50&order=desc&order_by=timestamp')
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Runes:', data.data.results);
    }
  });
```

**Resposta de Exemplo**:
```json
{
  "success": true,
  "data": {
    "limit": 50,
    "offset": 0,
    "total": 1245,
    "results": [
      {
        "id": "840000:1",
        "symbol": "UNCOMMON•GOODS",
        "name": "UNCOMMON•GOODS",
        "timestamp": "2024-04-20T00:00:00.000Z",
        "block_height": 840000,
        "tx_id": "abc123...",
        "total_supply": "21000000",
        "holders": 1250,
        "market_cap_usd": 125000,
        "price_usd": 5.95,
        "last_activity": "2024-06-22T20:00:00.000Z"
      }
    ]
  },
  "source": "hiro-runes-api",
  "timestamp": "2024-06-22T20:42:00.000Z",
  "cached": false,
  "responseTime": 850
}
```

### 2. `/api/runes/holders/[etching]` - Holders de um Rune Específico

Retorna a lista de holders de um rune específico.

**Método**: `GET`

**Parâmetros de Rota**:
- `etching`: Nome do rune (ex: `UNCOMMON•GOODS`)

**Parâmetros de Query**:
- `limit`: Número de resultados (1-1000, padrão: 100)
- `offset`: Deslocamento para paginação (padrão: 0)
- `order`: Ordem dos resultados (`asc` ou `desc`, padrão: `desc`)
- `order_by`: Campo para ordenação (`balance`, `timestamp`, `address`, padrão: `balance`)

**Exemplo de Uso**:
```javascript
// Buscar top 25 holders do rune UNCOMMON•GOODS
fetch('/api/runes/holders/UNCOMMON•GOODS?limit=25&order=desc&order_by=balance')
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Top Holders:', data.data.results);
    }
  });
```

**Resposta de Exemplo**:
```json
{
  "success": true,
  "data": {
    "etching": "UNCOMMON•GOODS",
    "limit": 25,
    "offset": 0,
    "total": 1250,
    "total_supply": "21000000",
    "results": [
      {
        "address": "bc1qxy2kgdygjrsqtzq2n0yrf2494r83vwkh4fnx8k",
        "balance": "500000",
        "balance_formatted": "500K",
        "balance_percentage": "2.3810",
        "rank": 1,
        "address_short": "bc1qxy...fnx8k",
        "timestamp": "2024-04-20T00:00:00.000Z",
        "last_activity": "2024-06-22T19:30:00.000Z"
      }
    ]
  },
  "source": "hiro-runes-api",
  "timestamp": "2024-06-22T20:42:00.000Z",
  "cached": false,
  "responseTime": 650
}
```

### 3. `/api/runes/activity/[etching]` - Atividade de Transações

Retorna o histórico de atividades/transações de um rune específico.

**Método**: `GET`

**Parâmetros de Rota**:
- `etching`: Nome do rune (ex: `UNCOMMON•GOODS`)

**Parâmetros de Query**:
- `limit`: Número de resultados (1-500, padrão: 50)
- `offset`: Deslocamento para paginação (padrão: 0)
- `order`: Ordem dos resultados (`asc` ou `desc`, padrão: `desc`)
- `order_by`: Campo para ordenação (`timestamp`, `amount`, `block_height`, padrão: `timestamp`)
- `operation`: Filtrar por tipo de operação (`transfer`, `mint`, `burn`)
- `from_block`: Altura do bloco inicial
- `to_block`: Altura do bloco final

**Exemplo de Uso**:
```javascript
// Buscar últimas 20 transferências do rune UNCOMMON•GOODS
fetch('/api/runes/activity/UNCOMMON•GOODS?limit=20&operation=transfer')
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Recent Activity:', data.data.results);
    }
  });
```

**Resposta de Exemplo**:
```json
{
  "success": true,
  "data": {
    "etching": "UNCOMMON•GOODS",
    "limit": 20,
    "offset": 0,
    "total": 5420,
    "results": [
      {
        "tx_id": "def456789abcdef...",
        "operation": "transfer",
        "operation_type": "Transfer",
        "amount": "1000",
        "amount_formatted": "1K",
        "from_address": "bc1qxy2kgdygjrsqtzq2n0yrf2494r83vwkh4fnx8k",
        "to_address": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
        "from_short": "bc1qxy...fnx8k",
        "to_short": "bc1qar...5mdq",
        "timestamp": "2024-06-22T20:35:00.000Z",
        "time_ago": "7m ago",
        "block_height": 845120,
        "confirmations": 3,
        "usd_value": "$5,950.00",
        "tx_short": "def45678...cdef",
        "price_usd": 5.95
      }
    ]
  },
  "source": "hiro-runes-api",
  "timestamp": "2024-06-22T20:42:00.000Z",
  "cached": false,
  "responseTime": 420
}
```

### 4. `/api/runes/price-data` - Dados de Preço

Retorna dados de preço para runes, incluindo preços históricos e métricas de mercado.

**Método**: `GET`

**Parâmetros de Query**:
- `symbols`: Lista de símbolos separados por vírgula (ex: `UNCOMMON•GOODS,DOG•GO•TO•THE•MOON`)
- `interval`: Intervalo dos dados (`1m`, `5m`, `15m`, `1h`, `4h`, `1d`, padrão: `1h`)
- `period`: Período dos dados (`1h`, `4h`, `24h`, `7d`, `30d`, padrão: `24h`)
- `limit`: Número de resultados (1-1000, padrão: 100)

**Exemplo de Uso**:
```javascript
// Buscar dados de preço para múltiplos runes
fetch('/api/runes/price-data?symbols=UNCOMMON•GOODS,DOG•GO•TO•THE•MOON&interval=1h&period=24h')
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Price Data:', data.data.results);
    }
  });

// Buscar dados gerais do mercado
fetch('/api/runes/price-data?interval=4h&period=7d&limit=50')
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Market Overview:', data.data.results);
    }
  });
```

**Resposta de Exemplo**:
```json
{
  "success": true,
  "data": {
    "interval": "1h",
    "period": "24h", 
    "total_runes": 2,
    "requested_symbols": ["UNCOMMON•GOODS", "DOG•GO•TO•THE•MOON"],
    "results": [
      {
        "symbol": "UNCOMMON•GOODS",
        "data": {
          "etching": "UNCOMMON•GOODS",
          "symbol": "UNCOMMON•GOODS",
          "price_usd": "5.950000",
          "price_btc": "0.00015420",
          "volume_24h": "125000.50",
          "volume_24h_formatted": "125K",
          "market_cap": "124950000.00",
          "market_cap_formatted": "125M",
          "price_change_24h": 0.45,
          "price_change_percentage_24h": 8.18,
          "last_updated": "2024-06-22T20:42:00.000Z",
          "price_trend": "bullish",
          "support_level": 5.20,
          "resistance_level": 6.80
        },
        "error": null
      }
    ]
  },
  "source": "hiro-runes-api",
  "timestamp": "2024-06-22T20:42:00.000Z",
  "cached": false,
  "responseTime": 580
}
```

## Estrutura de Resposta Padrão

Todas as rotas seguem a mesma estrutura de resposta:

```json
{
  "success": boolean,
  "data": any,
  "source": string,
  "timestamp": string,
  "cached?": boolean,
  "responseTime?": number,
  "error?": string
}
```

## Tratamento de Erros

### Códigos de Status HTTP

- `200`: Sucesso
- `400`: Parâmetros inválidos
- `408`: Timeout da requisição
- `429`: Rate limit excedido
- `500`: Erro interno do servidor

### Fallbacks

Quando a API Hiro não está disponível, as rotas retornam:
- Dados em cache (se disponíveis)
- Dados mock estruturados
- Mensagens de erro detalhadas

## Rate Limiting

- **Etchings/Holders**: 60 requests por minuto
- **Activity**: 60 requests por minuto
- **Price Data**: 100 requests por minuto (mais permissivo)

## Cache

- **Etchings**: 5 minutos (dados menos voláteis)
- **Holders**: 5 minutos (dados menos voláteis)
- **Activity**: 2 minutos (dados mais voláteis)
- **Price Data**: 1 minuto (dados muito voláteis)

## Exemplos de Integração

### React Hook Personalizado

```javascript
import { useState, useEffect } from 'react';

export function useRunesData(endpoint, params = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/runes/${endpoint}${queryString ? `?${queryString}` : ''}`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, JSON.stringify(params)]);

  return { data, loading, error };
}

// Uso do hook
function RunesComponent() {
  const { data, loading, error } = useRunesData('etchings', { 
    limit: 50, 
    order: 'desc' 
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {data?.results?.map(rune => (
        <div key={rune.id}>{rune.symbol}</div>
      ))}
    </div>
  );
}
```

### Configuração Global

```javascript
// config/runes-api.js
export const RUNES_API_CONFIG = {
  BASE_URL: '/api/runes',
  CACHE_ENABLED: true,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

export class RunesAPIClient {
  async fetchEtchings(params = {}) {
    return this.request('etchings', params);
  }
  
  async fetchHolders(etching, params = {}) {
    return this.request(`holders/${encodeURIComponent(etching)}`, params);
  }
  
  async fetchActivity(etching, params = {}) {
    return this.request(`activity/${encodeURIComponent(etching)}`, params);
  }
  
  async fetchPriceData(params = {}) {
    return this.request('price-data', params);
  }
  
  async request(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${RUNES_API_CONFIG.BASE_URL}/${endpoint}${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'API request failed');
    }
    
    return data.data;
  }
}
```

## Logs e Monitoramento

Todos os erros são logados com detalhes:
- Timestamp
- Contexto da operação
- Stack trace
- Status da resposta da API

Os logs podem ser encontrados no console do servidor durante o desenvolvimento.

## Considerações de Performance

1. **Cache Inteligente**: TTL diferenciado por tipo de dados
2. **Rate Limiting**: Previne sobrecarga da API
3. **Timeouts**: Evita requisições que ficam pendentes
4. **Fallbacks**: Garante disponibilidade mesmo com API offline
5. **Abort Controllers**: Cancelamento de requisições em timeout
6. **Data Transformation**: Enriquecimento dos dados retornados

## Próximos Passos

1. Implementar WebSocket para dados em tempo real
2. Adicionar métricas de performance 
3. Implementar cache Redis para produção
4. Adicionar testes automatizados
5. Implementar compressão de resposta