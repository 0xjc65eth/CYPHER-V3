// =============================================================================
// CYPHER V3 - Rune Card Component
// Card de Rune com sparkline, price change, mint status, favoritos e alertas
// Módulo independente - não depende de Ordinals
// =============================================================================

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  ExternalLink,
  Users,
  Tag,
  Coins,
  TrendingUp,
  BarChart3,
  Verified,
  Layers,
} from 'lucide-react';
import { ProcessedRune } from '../types/runes';
import {
  Sparkline,
  PriceChange,
  MintBadge,
  TurboBadge,
  FavoriteButton,
  AlertButton,
} from './RunesUI';

// -----------------------------------------------------------------------------
// Formatters
// -----------------------------------------------------------------------------

function formatSats(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString();
}

function formatBtc(value: number, decimals = 6): string {
  if (value >= 1) return value.toFixed(4);
  if (value >= 0.001) return value.toFixed(6);
  return value.toFixed(8);
}

function formatUsd(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

function formatNumber(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatSupply(value: number, divisibility: number): string {
  if (divisibility > 0) {
    const adjusted = value / Math.pow(10, divisibility);
    return formatNumber(adjusted);
  }
  return formatNumber(value);
}

// -----------------------------------------------------------------------------
// RuneCard - Grid View
// -----------------------------------------------------------------------------

interface RuneCardProps {
  rune: ProcessedRune;
  onFavoriteToggle: (id: string) => void;
  onAlertClick: (rune: ProcessedRune) => void;
  hasAlert?: boolean;
  onClick?: () => void;
}

export function RuneCard({
  rune,
  onFavoriteToggle,
  onAlertClick,
  hasAlert = false,
  onClick,
}: RuneCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative p-4 rounded-xl bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header: Symbol + Name */}
      <div className="flex items-start gap-3 mb-4">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 flex-shrink-0 flex items-center justify-center">
          {!imageError && rune.imageUrl ? (
            <Image
              src={rune.imageUrl}
              alt={rune.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <span className="text-2xl font-bold text-white">{rune.symbol}</span>
          )}

          {rune.verified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
              <Verified className="w-3 h-3 text-black" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white text-sm truncate">{rune.name}</h3>
              <p className="text-xs text-zinc-500 truncate">{rune.symbol}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <FavoriteButton isFavorite={rune.isFavorite} onClick={() => onFavoriteToggle(rune.id)} size="sm" />
              <AlertButton hasAlert={hasAlert} onClick={() => onAlertClick(rune)} size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <PriceChange value={rune.priceChange24h} size="sm" />
            {rune.turbo && <TurboBadge turbo={rune.turbo} />}
          </div>
        </div>
      </div>

      {/* Unit Price */}
      <div className="mb-3">
        <p className="text-xs text-zinc-500 mb-1">Unit Price</p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-white">{formatSats(rune.floorPriceSats)}</span>
          <span className="text-sm text-orange-500">sats</span>
        </div>
        <p className="text-xs text-zinc-500">{formatUsd(rune.floorPriceUsd)}</p>
      </div>

      {/* Market Cap */}
      <div className="mb-3 p-2 rounded-lg bg-zinc-800/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Market Cap</span>
          <span className="text-sm font-medium text-white">{formatUsd(rune.marketCapUsd)}</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mb-4 p-2 rounded-lg bg-zinc-800/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-500">7d Volume</span>
          <span className="text-xs text-zinc-400">{formatBtc(rune.volume7d, 4)} BTC</span>
        </div>
        <Sparkline data={rune.volumeHistory7d} width={280} height={32} showTrend />
      </div>

      {/* Mint Status */}
      <div className="mb-4">
        <MintBadge mintable={rune.mintable} mintProgress={rune.mintProgress} />
        {rune.mintable && (
          <div className="mt-2 w-full bg-zinc-800 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-orange-500 to-amber-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${rune.mintProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded-lg bg-zinc-800/30">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <BarChart3 className="w-3 h-3" />
            <span className="text-xs">Vol 24h</span>
          </div>
          <p className="text-sm font-medium text-white">{formatBtc(rune.volume24h, 4)} BTC</p>
        </div>

        <div className="p-2 rounded-lg bg-zinc-800/30">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <Tag className="w-3 h-3" />
            <span className="text-xs">Listed</span>
          </div>
          <p className="text-sm font-medium text-white">{formatNumber(rune.listed)}</p>
        </div>

        <div className="p-2 rounded-lg bg-zinc-800/30">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <Users className="w-3 h-3" />
            <span className="text-xs">Holders</span>
          </div>
          <p className="text-sm font-medium text-white">{formatNumber(rune.holders)}</p>
        </div>

        <div className="p-2 rounded-lg bg-zinc-800/30">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <Layers className="w-3 h-3" />
            <span className="text-xs">Supply</span>
          </div>
          <p className="text-sm font-medium text-white">{formatSupply(rune.totalSupply, rune.divisibility)}</p>
        </div>
      </div>

      {/* Hover Overlay */}
      {isHovered && (
        <div className="absolute inset-0 p-4 rounded-xl bg-zinc-900/95 backdrop-blur-md border border-zinc-700 flex flex-col justify-center animate-fade-in">
          <h3 className="font-semibold text-white text-lg mb-1 truncate">{rune.name}</h3>
          <p className="text-zinc-500 text-sm mb-4">{rune.spacedName}</p>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Unit Price</span>
              <div className="text-right">
                <span className="text-white font-medium">{formatSats(rune.floorPriceSats)} sats</span>
                <span className="text-zinc-500 text-xs ml-2">({formatUsd(rune.floorPriceUsd)})</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Market Cap</span>
              <span className="text-white font-medium">{formatUsd(rune.marketCapUsd)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">24h Change</span>
              <PriceChange value={rune.priceChange24h} size="sm" />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">7d Change</span>
              <PriceChange value={rune.priceChange7d} size="sm" />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Divisibility</span>
              <span className="text-white font-medium">{rune.divisibility}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Listed %</span>
              <span className="text-white font-medium">{rune.listedPct.toFixed(2)}%</span>
            </div>
          </div>

          <button className="mt-4 w-full py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
            View on Magic Eden
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// RuneRow - Table View
// -----------------------------------------------------------------------------

interface RuneRowProps {
  rune: ProcessedRune;
  index: number;
  onFavoriteToggle: (id: string) => void;
  onAlertClick: (rune: ProcessedRune) => void;
  hasAlert?: boolean;
  onClick?: () => void;
}

export function RuneRow({
  rune,
  index,
  onFavoriteToggle,
  onAlertClick,
  hasAlert = false,
  onClick,
}: RuneRowProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <tr className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-800/50 transition-colors cursor-pointer" onClick={onClick}>
      <td className="py-3 px-4 text-zinc-500 text-sm">{index + 1}</td>

      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 flex-shrink-0 flex items-center justify-center">
            {!imageError && rune.imageUrl ? (
              <Image src={rune.imageUrl} alt={rune.name} fill className="object-cover" onError={() => setImageError(true)} unoptimized />
            ) : (
              <span className="text-lg font-bold text-white">{rune.symbol}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{rune.name}</span>
              {rune.verified && <Verified className="w-4 h-4 text-orange-500" />}
              {rune.turbo && <TurboBadge turbo={rune.turbo} />}
            </div>
            <span className="text-xs text-zinc-500">{rune.symbol}</span>
          </div>
        </div>
      </td>

      <td className="py-3 px-4">
        <div>
          <span className="text-white font-medium">{formatSats(rune.floorPriceSats)} sats</span>
          <br />
          <span className="text-xs text-zinc-500">{formatUsd(rune.floorPriceUsd)}</span>
        </div>
      </td>

      <td className="py-3 px-4">
        <PriceChange value={rune.priceChange24h} size="sm" />
      </td>

      <td className="py-3 px-4">
        <span className="text-white">{formatUsd(rune.marketCapUsd)}</span>
      </td>

      <td className="py-3 px-4">
        <div>
          <span className="text-white">{formatBtc(rune.volume24h, 4)} BTC</span>
          <br />
          <span className="text-xs text-zinc-500">{formatUsd(rune.volume24hUsd)}</span>
        </div>
      </td>

      <td className="py-3 px-4">
        <Sparkline data={rune.volumeHistory7d} width={60} height={20} showTrend />
      </td>

      <td className="py-3 px-4 text-white">{formatNumber(rune.holders)}</td>

      <td className="py-3 px-4">
        <MintBadge mintable={rune.mintable} mintProgress={rune.mintProgress} />
      </td>

      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          <FavoriteButton isFavorite={rune.isFavorite} onClick={() => onFavoriteToggle(rune.id)} size="sm" />
          <AlertButton hasAlert={hasAlert} onClick={() => onAlertClick(rune)} size="sm" />
        </div>
      </td>
    </tr>
  );
}

// -----------------------------------------------------------------------------
// RuneTable - Table Container
// -----------------------------------------------------------------------------

interface RuneTableProps {
  runes: ProcessedRune[];
  onFavoriteToggle: (id: string) => void;
  onAlertClick: (rune: ProcessedRune) => void;
  alertRuneIds?: Set<string>;
  onRuneClick?: (rune: ProcessedRune) => void;
}

export function RuneTable({
  runes,
  onFavoriteToggle,
  onAlertClick,
  alertRuneIds = new Set(),
  onRuneClick,
}: RuneTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full">
        <thead className="bg-zinc-900/50">
          <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
            <th className="py-3 px-4 font-medium">#</th>
            <th className="py-3 px-4 font-medium">Rune</th>
            <th className="py-3 px-4 font-medium">Unit Price</th>
            <th className="py-3 px-4 font-medium">24h %</th>
            <th className="py-3 px-4 font-medium">Market Cap</th>
            <th className="py-3 px-4 font-medium">Vol 24h</th>
            <th className="py-3 px-4 font-medium">Trend</th>
            <th className="py-3 px-4 font-medium">Holders</th>
            <th className="py-3 px-4 font-medium">Mint</th>
            <th className="py-3 px-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {runes.map((rune, index) => (
            <RuneRow
              key={rune.id}
              rune={rune}
              index={index}
              onFavoriteToggle={onFavoriteToggle}
              onAlertClick={onAlertClick}
              hasAlert={alertRuneIds.has(rune.id)}
              onClick={() => onRuneClick?.(rune)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RuneCard;
