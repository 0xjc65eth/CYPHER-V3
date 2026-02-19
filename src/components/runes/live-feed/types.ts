export type EventType = 'MINT' | 'TRADE_BUY' | 'TRADE_SELL' | 'ETCH' | 'TRANSFER' | 'WHALE' | 'SWAP' | 'CANCEL' | 'BURN';

export interface FeedEvent {
  id: string;
  type: EventType;
  rune: string;
  description: string;
  amount: number;
  price?: number;
  from: string;
  to: string;
  txid: string;
  timestamp: number;
  isNew?: boolean;
}

export type FilterKey = 'ALL' | 'MINT' | 'TRADE' | 'ETCH' | 'TRANSFER' | 'WHALE' | 'SWAP' | 'CANCEL' | 'BURN';
