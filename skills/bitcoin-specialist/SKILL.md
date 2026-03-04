---
name: bitcoin-specialist
description: Especialista em Bitcoin Ordinals, Runes, BRC-20, Rare Sats, wallet integration e protocolo Bitcoin para CYPHER V3
version: "2.0"
tags: [bitcoin, ordinals, runes, brc20, rare-sats, lasereyes, xverse]
---

# SKILL: Bitcoin Specialist — CYPHER V3

## Protocolo Bitcoin — Contexto Essencial

### Ordinals
- Protocolo que permite inscrever dados em satoshis individuais
- Cada inscrição tem um ID único: `[txid]i[index]` (ex: `a1b2c3...i0`)
- Indexado pelo **Hiro Systems** (open source, confiável)
- Marketplace principal agora: **OKX NFT** e **Gamma.io** (Magic Eden a sair)

### Runes
- Protocolo fungível sobre Bitcoin (como ERC-20 mas em Bitcoin)
- Lançado por Casey Rodarmor (mesmo criador dos Ordinals)
- Nome formato: `WORD•WORD•WORD` (separados por bullets)
- Indexado por: **Hiro Runehook**, **UniSat**

### BRC-20
- Tokens fungíveis via inscrições JSON
- Padrão: `{ "p": "brc-20", "op": "mint", "tick": "ordi", "amt": "1000" }`
- Indexado por: **UniSat**, **Hiro**

### Rare Sats
- Satoshis com propriedades especiais (Uncommon, Rare, Epic, Legendary, Mythic)
- Satributos especiais: Vintage, Black Uncommon, First Transaction, etc.
- 25 categorias no CYPHER V3 (módulo roxo)

## Wallet Integration

### LaserEyes (`@omnisat/lasereyes`) — Primary
```typescript
import { useLaserEyes, XVERSE, UNISAT, OYL } from '@omnisat/lasereyes'

export function WalletConnect() {
  const { connect, disconnect, address, publicKey, balance, network } = useLaserEyes()

  const handleConnect = async (walletType: typeof XVERSE) => {
    try {
      await connect(walletType)
    } catch (err) {
      console.error('[WalletConnect] Failed:', err)
    }
  }

  return (
    <div>
      {address ? (
        <div>
          <span className="font-mono text-[#FF6B00]">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button onClick={disconnect}>Desligar</button>
        </div>
      ) : (
        <button onClick={() => handleConnect(XVERSE)}>Conectar Xverse</button>
      )}
    </div>
  )
}
```

### Transações Bitcoin Seguras
```typescript
// SEMPRE validar endereço antes de qualquer transação
import { validate as validateBitcoinAddress } from 'bitcoin-address-validation'

function isValidBitcoinAddress(address: string): boolean {
  return validateBitcoinAddress(address)
}

// SEMPRE usar sats-connect para signing
import { sendBtcTransaction } from 'sats-connect'

async function sendBTC(recipient: string, amountSats: number) {
  if (!isValidBitcoinAddress(recipient)) throw new Error('Invalid Bitcoin address')
  if (amountSats < 546) throw new Error('Below dust limit (546 sats)')

  return new Promise((resolve, reject) => {
    sendBtcTransaction({
      payload: {
        network: { type: 'Mainnet' },
        recipients: [{ address: recipient, amountSats }],
        senderAddress: walletAddress,
      },
      onFinish: resolve,
      onCancel: () => reject(new Error('User cancelled')),
    })
  })
}
```

## APIs de Produção

### Hiro API — Ordinals & Runes
```typescript
const HIRO_BASE = 'https://api.hiro.so'

// Coleções de Ordinals
GET /ordinals/v1/collections?limit=20&order_by=volume_24h&order=desc

// Inscrições por coleção
GET /ordinals/v1/collections/{id}/inscriptions?limit=60

// Runes
GET /runes/v1/etchings?limit=20&order=desc

// BRC-20
GET /ordinals/v1/brc-20/tokens?limit=20&order_by=market_cap

// Rare Sats por endereço
GET /ordinals/v1/inscriptions?address={address}&limit=60
```

### UniSat API
```typescript
const UNISAT_BASE = 'https://open-api.unisat.io/v1'
// Headers: { Authorization: `Bearer ${process.env.UNISAT_API_KEY}` }

// BRC-20 tokens
GET /indexer/brc20/list?start=0&limit=20

// Inscrições de um endereço
GET /indexer/address/{address}/inscription-data

// Runes de um endereço
GET /indexer/address/{address}/runes/utxo-list
```

### OKX NFT API (substituto Magic Eden)
```typescript
const OKX_BASE = 'https://www.okx.com/api/v5/mktplace'

// Coleções de Ordinals
GET /nft/ordinals/collection/list

// Floor price de uma coleção
GET /nft/ordinals/collection/overview?collectionId={id}

// Listings
GET /nft/ordinals/token/listings?collectionId={id}&limit=20
```

## Padrões de Cache para Bitcoin Data
```typescript
// Bitcoin data tem latência diferente:
// - Preço BTC: 30s cache
// - Ordinals floor price: 60s cache
// - Runes market data: 120s cache
// - Rare Sats de um endereço: 300s cache

const CACHE_TTL = {
  BTC_PRICE: 30,
  ORDINALS_FLOOR: 60,
  RUNES_MARKET: 120,
  RARE_SATS: 300,
  INSCRIPTIONS: 600,
} as const
```

## Terminologia Importante
| Termo | Significado |
|-------|-------------|
| Satoshi / Sat | 0.00000001 BTC, unidade mínima |
| UTXO | Unspent Transaction Output |
| Inscription | Dado inscrito num satoshi específico |
| Ordinal | Número de série de um satoshi |
| Rune | Token fungível no protocolo Runes |
| Etch | Criar um novo Rune |
| Mint | Criar supply de um Rune existente |
| BRC-20 | Token fungível via Ordinals JSON |
| Rare Sat | Satoshi com propriedades especiais |
| Satribute | Tipo/categoria de rare sat |

## ⚠️ Avisos Críticos
- NUNCA assumir Magic Eden está disponível — está a deprecar Ordinals/Runes
- NUNCA usar testnets como "Bitcoin Testnet" para validar lógica de mainnet
- NUNCA expor xpub/public keys em logs
- Dust limit Bitcoin: **546 sats** — não enviar menos
- Fees em BTC são em sats/vByte, não em BTC
