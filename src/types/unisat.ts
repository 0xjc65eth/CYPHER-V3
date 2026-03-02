/**
 * UniSat API Types - CYPHER V3
 *
 * Types for UniSat API integration (Bitcoin Ordinals, BRC-20, Runes).
 * UniSat is one of the primary replacement APIs for the deprecated Magic Eden.
 */

// ─── Address & Balance ────────────────────────────────────────────────────────

export interface UniSatAddressBalance {
  address: string;
  satoshi: number;
  pendingSatoshi: number;
  utxoCount: number;
  btcSatoshi: number;
  btcPendingSatoshi: number;
  btcUtxoCount: number;
  inscriptionSatoshi: number;
  inscriptionPendingSatoshi: number;
  inscriptionUtxoCount: number;
}

export interface UniSatUtxo {
  txid: string;
  vout: number;
  satoshi: number;
  scriptType: string;
  scriptPk: string;
  codeType: number;
  address: string;
  height: number;
  idx: number;
  isOpInRBF: boolean;
  isSpent: boolean;
  inscriptions: UniSatInscription[];
}

// ─── Inscriptions ─────────────────────────────────────────────────────────────

export interface UniSatInscription {
  inscriptionId: string;
  inscriptionNumber: number;
  address: string;
  outputValue: number;
  preview?: string;
  content?: string;
  contentType: string;
  contentLength: number;
  timestamp: number;
  genesisTransaction: string;
  location: string;
  output: string;
  offset: number;
  contentBody?: string;
  utxoHeight?: number;
  utxoConfirmation?: number;
}

export interface UniSatInscriptionsResponse {
  list: UniSatInscription[];
  total: number;
}

// ─── BRC-20 ───────────────────────────────────────────────────────────────────

export interface UniSatBRC20Token {
  ticker: string;
  overallBalance: string;
  transferableBalance: string;
  availableBalance: string;
  availableBalanceSafe: string;
  availableBalanceUnconfirmed: string;
}

export interface UniSatBRC20Info {
  ticker: string;
  holdersCount: number;
  historyCount: number;
  inscriptionNumber: number;
  inscriptionId: string;
  max: string;
  limit: string;
  minted: string;
  totalMinted: string;
  mintTimes: number;
  decimal: number;
  creator: string;
  txid: string;
  deployHeight: number;
  deployBlocktime: number;
  completeHeight: number;
  completeBlocktime: number;
  inscriptionNumberStart: number;
  inscriptionNumberEnd: number;
}

export interface UniSatBRC20Holder {
  address: string;
  overallBalance: string;
  transferableBalance: string;
  availableBalance: string;
}

export interface UniSatBRC20History {
  type: string;
  valid: boolean;
  txid: string;
  idx: number;
  inscriptionNumber: number;
  inscriptionId: string;
  amount: string;
  from: string;
  to: string;
  height: number;
  blocktime: number;
  contentBody?: string;
}

// ─── Runes ────────────────────────────────────────────────────────────────────

export interface UniSatRuneInfo {
  runeId: string;
  rune: string;
  spacedRune: string;
  number: number;
  divisibility: number;
  symbol: string;
  turbo: boolean;
  mintable: boolean;
  holders: number;
  transactions: number;
  supply: string;
  mintProgress: number;
  premine: string;
  burned: string;
  timestamp: number;
  etchingTxid: string;
  terms?: {
    amount: string;
    cap: string;
    heightStart?: number;
    heightEnd?: number;
    offsetStart?: number;
    offsetEnd?: number;
  };
}

export interface UniSatRuneBalance {
  rune: string;
  runeId: string;
  spacedRune: string;
  amount: string;
  symbol: string;
  divisibility: number;
}

export interface UniSatRuneHolder {
  address: string;
  amount: string;
}

export interface UniSatRuneHistory {
  type: string;
  txid: string;
  blockHeight: number;
  blockTime: number;
  amount: string;
  from?: string;
  to?: string;
}

// ─── Market ───────────────────────────────────────────────────────────────────

export interface UniSatMarketCollection {
  collectionId: string;
  name: string;
  description?: string;
  icon?: string;
  supply: number;
  floorPrice: number;
  listed: number;
  owners: number;
  totalVolume: number;
  volume24h: number;
  priceChange24h: number;
}

export interface UniSatMarketRuneListing {
  auctionId: string;
  rune: string;
  unitPrice: number;
  amount: string;
  totalPrice: number;
  seller: string;
  status: string;
  createdAt: number;
  txid?: string;
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface UniSatApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface UniSatPaginatedResponse<T> {
  list: T[];
  total: number;
}

// ─── Block ────────────────────────────────────────────────────────────────────

export interface UniSatBlockInfo {
  height: number;
  hash: string;
  confirmations: number;
  size: number;
  weight: number;
  version: number;
  timestamp: number;
  tx_count: number;
  bits: string;
  nonce: number;
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export interface UniSatTransaction {
  txid: string;
  version: number;
  locktime: number;
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  vin: Array<{
    txid: string;
    vout: number;
    prevout: {
      scriptpubkey: string;
      scriptpubkey_address: string;
      value: number;
    };
    sequence: number;
  }>;
  vout: Array<{
    scriptpubkey: string;
    scriptpubkey_address: string;
    value: number;
  }>;
}
