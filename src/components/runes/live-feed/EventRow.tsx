'use client';

import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { timeAgo, truncateAddress, truncateTxId, isValidBtcAddress, isValidTxid } from '@/lib/utils/runes-formatters';
import { EVENT_CONFIG } from './config';
import type { FeedEvent } from './types';

export function EventRow({ event }: { event: FeedEvent }) {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;
  const isWhale = event.type === 'WHALE';

  return (
    <div
      className={`
        flex items-start gap-3 rounded-md border-l-2 px-3 py-2.5 transition-colors duration-[2000ms]
        ${config.borderClass}
        ${isWhale ? 'border border-orange-500/30 bg-orange-950/10' : 'border border-transparent bg-gray-900/60'}
        ${event.isNew ? 'bg-gray-800' : ''}
      `}
    >
      {/* Left: icon + badge */}
      <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
        <Icon className="h-4 w-4 text-gray-400" />
        <Badge className={`text-[10px] font-bold ${config.badgeClass}`}>
          {config.label}
        </Badge>
      </div>

      {/* Center: description + addresses */}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-mono text-sm font-medium text-gray-100">
          {event.description}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
          <span>
            From:{' '}
            {isValidBtcAddress(event.from) ? (
              <a href={`https://mempool.space/address/${event.from}`} target="_blank" rel="noopener noreferrer" className="font-mono text-gray-400 hover:text-blue-400 transition-colors">
                {truncateAddress(event.from)} <ExternalLink className="h-3 w-3 inline ml-0.5" />
              </a>
            ) : (
              <span className="font-mono text-gray-600">{event.from}</span>
            )}
          </span>
          <span>
            To:{' '}
            {isValidBtcAddress(event.to) ? (
              <a href={`https://mempool.space/address/${event.to}`} target="_blank" rel="noopener noreferrer" className="font-mono text-gray-400 hover:text-blue-400 transition-colors">
                {truncateAddress(event.to)} <ExternalLink className="h-3 w-3 inline ml-0.5" />
              </a>
            ) : (
              <span className="font-mono text-gray-600">{event.to}</span>
            )}
          </span>
          <span>
            Tx:{' '}
            {isValidTxid(event.txid) ? (
              <a href={`https://mempool.space/tx/${event.txid}`} target="_blank" rel="noopener noreferrer" className="font-mono text-gray-400 hover:text-blue-400 transition-colors">
                {truncateTxId(event.txid)} <ExternalLink className="h-3 w-3 inline ml-0.5" />
              </a>
            ) : (
              <span className="font-mono text-gray-600">{truncateTxId(event.txid)}</span>
            )}
          </span>
          <span>
            Rune:{' '}
            <a href={`https://ordinals.com/rune/${encodeURIComponent(event.rune)}`} target="_blank" rel="noopener noreferrer" className="font-mono text-gray-400 hover:text-blue-400 transition-colors">
              {event.rune} <ExternalLink className="h-3 w-3 inline ml-0.5" />
            </a>
          </span>
        </div>
      </div>

      {/* Right: timestamp */}
      <div className="flex-shrink-0 pt-0.5 text-right text-xs text-gray-500">
        {timeAgo(event.timestamp)}
      </div>
    </div>
  );
}
