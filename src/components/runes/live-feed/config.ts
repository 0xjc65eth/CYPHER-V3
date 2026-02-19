import type { ElementType } from 'react';
import {
  Radio,
  Hammer,
  ArrowUpDown,
  Sparkles,
  Send,
  Fish,
  Repeat,
  X,
  Flame,
} from 'lucide-react';
import type { EventType, FilterKey } from './types';

export const MAX_EVENTS = 100;

export const EVENT_CONFIG: Record<EventType, {
  label: string;
  icon: ElementType;
  badgeClass: string;
  borderClass: string;
}> = {
  MINT: {
    label: 'MINT',
    icon: Hammer,
    badgeClass: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    borderClass: 'border-l-blue-500',
  },
  TRADE_BUY: {
    label: 'BUY',
    icon: ArrowUpDown,
    badgeClass: 'bg-green-600/20 text-green-400 border-green-500/30',
    borderClass: 'border-l-green-500',
  },
  TRADE_SELL: {
    label: 'SELL',
    icon: ArrowUpDown,
    badgeClass: 'bg-red-600/20 text-red-400 border-red-500/30',
    borderClass: 'border-l-red-500',
  },
  ETCH: {
    label: 'ETCH',
    icon: Sparkles,
    badgeClass: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
    borderClass: 'border-l-purple-500',
  },
  TRANSFER: {
    label: 'TRANSFER',
    icon: Send,
    badgeClass: 'bg-gray-600/20 text-gray-400 border-gray-500/30',
    borderClass: 'border-l-gray-500',
  },
  WHALE: {
    label: 'WHALE',
    icon: Fish,
    badgeClass: 'bg-orange-600/20 text-orange-400 border-orange-500/30',
    borderClass: 'border-l-orange-500',
  },
  SWAP: {
    label: 'SWAP',
    icon: Repeat,
    badgeClass: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30',
    borderClass: 'border-l-cyan-500',
  },
  CANCEL: {
    label: 'CANCEL',
    icon: X,
    badgeClass: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
    borderClass: 'border-l-yellow-500',
  },
  BURN: {
    label: 'BURN',
    icon: Flame,
    badgeClass: 'bg-red-700/20 text-red-300 border-red-600/30',
    borderClass: 'border-l-red-600',
  },
};

export const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'MINT', label: 'Mints' },
  { key: 'TRADE', label: 'Trades' },
  { key: 'SWAP', label: 'Swaps' },
  { key: 'TRANSFER', label: 'Transfers' },
  { key: 'BURN', label: 'Burns' },
  { key: 'CANCEL', label: 'Cancels' },
  { key: 'ETCH', label: 'Etchings' },
  { key: 'WHALE', label: 'Whales' },
];
