'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Inscription } from '@/stores/trading-store';

interface OrdinalsGalleryProps {
  inscriptions: Inscription[];
  viewMode: 'gallery' | 'list';
  sortBy: 'number' | 'timestamp' | 'rarity';
  onInscriptionClick: (inscription: Inscription) => void;
}

export const OrdinalsGallery: React.FC<OrdinalsGalleryProps> = ({
  inscriptions,
  viewMode,
  sortBy,
  onInscriptionClick
}) => {
  // Sort inscriptions
  const sortedInscriptions = [...inscriptions].sort((a, b) => {
    switch (sortBy) {
      case 'number':
        return b.number - a.number;
      case 'timestamp':
        return b.timestamp - a.timestamp;
      case 'rarity':
        const rarityOrder = { 'legendary': 5, 'epic': 4, 'rare': 3, 'uncommon': 2, 'common': 1 };
        return (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) - 
               (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0);
      default:
        return b.timestamp - a.timestamp;
    }
  });

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'epic': return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
      case 'rare': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'uncommon': return 'text-green-400 border-green-400/30 bg-green-400/10';
      default: return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
    }
  };

  if (viewMode === 'gallery') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
        {sortedInscriptions.slice(0, 20).map((inscription) => (
          <div
            key={inscription.id}
            onClick={() => onInscriptionClick(inscription)}
            className="cursor-pointer group relative bg-bloomberg-black-700 rounded border border-bloomberg-orange/20 hover:border-bloomberg-orange/50 transition-all duration-200 overflow-hidden"
          >
            {/* Image placeholder */}
            <div className="aspect-square bg-bloomberg-black-600 flex items-center justify-center">
              <div className="text-xs text-bloomberg-orange/60 text-center p-2">
                <div className="font-terminal text-lg">#{inscription.number}</div>
                <div className="text-xs mt-1">{inscription.content_type}</div>
              </div>
            </div>
            
            {/* Rarity badge */}
            {inscription.rarity && (
              <div className={`absolute top-2 right-2 text-xs px-2 py-1 rounded border ${getRarityColor(inscription.rarity)}`}>
                {inscription.rarity}
              </div>
            )}
            
            {/* Info overlay */}
            <div className="p-2 border-t border-bloomberg-orange/20">
              <div className="flex items-center justify-between">
                <div className="text-xs font-terminal text-bloomberg-orange truncate">
                  #{inscription.number}
                </div>
                <a
                  href={`https://ordinals.com/inscription/${inscription.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              {inscription.collection && (
                <div className="text-xs text-bloomberg-orange/60 truncate">
                  {inscription.collection}
                </div>
              )}
              {inscription.price && (
                <div className="text-xs text-bloomberg-green font-terminal">
                  {inscription.price.toFixed(4)} BTC
                </div>
              )}
            </div>
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-bloomberg-orange/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className="text-xs text-white font-terminal">View Details</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {sortedInscriptions.slice(0, 50).map((inscription) => (
        <div
          key={inscription.id}
          onClick={() => onInscriptionClick(inscription)}
          className="cursor-pointer flex items-center gap-3 p-3 bg-bloomberg-black-700 rounded border border-bloomberg-orange/20 hover:border-bloomberg-orange/50 transition-colors"
        >
          {/* Thumbnail */}
          <div className="w-12 h-12 bg-bloomberg-black-600 rounded border border-bloomberg-orange/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-terminal text-bloomberg-orange">
              #{inscription.number.toString().slice(-3)}
            </span>
          </div>
          
          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <a
                href={`https://ordinals.com/inscription/${inscription.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-terminal text-bloomberg-orange hover:text-blue-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Inscription #{inscription.number} <ExternalLink className="h-3 w-3 inline ml-0.5" />
              </a>
              {inscription.rarity && (
                <span className={`text-xs px-2 py-0.5 rounded border ${getRarityColor(inscription.rarity)}`}>
                  {inscription.rarity}
                </span>
              )}
            </div>
            <div className="text-xs text-bloomberg-orange/60">
              {inscription.collection || 'Unknown Collection'} • {inscription.content_type}
            </div>
            <div className="text-xs text-bloomberg-orange/40">
              {new Date(inscription.timestamp).toLocaleString()}
            </div>
          </div>

          {/* Price */}
          <div className="text-right">
            {inscription.price ? (
              <div className="text-sm font-terminal text-bloomberg-green">
                {inscription.price.toFixed(4)} BTC
              </div>
            ) : (
              <div className="text-sm text-bloomberg-orange/60">
                Not Listed
              </div>
            )}
            {inscription.owner && (
              <a
                href={`https://mempool.space/address/${inscription.owner}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-bloomberg-orange/40 truncate max-w-24 block hover:text-blue-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {inscription.owner.slice(0, 8)}... <ExternalLink className="h-3 w-3 inline" />
              </a>
            )}
          </div>
        </div>
      ))}
      
      {sortedInscriptions.length === 0 && (
        <div className="text-center py-8 text-bloomberg-orange/60">
          <div className="text-lg font-terminal">No inscriptions found</div>
          <div className="text-sm">Try adjusting your filters</div>
        </div>
      )}
    </div>
  );
};