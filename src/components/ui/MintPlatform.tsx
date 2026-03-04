'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Zap, Users, DollarSign, Shield } from 'lucide-react';

interface MintPlatformProps {
  platform: 'unisat' | 'ordswap' | 'magiceden' | 'ordinalsbot' | 'gamma' | 'ordinalswallet';
  tokenSymbol?: string;
  tokenType: 'rune' | 'brc20' | 'ordinal';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const MINT_PLATFORMS = {
  unisat: {
    name: 'UniSat',
    icon: '🦄',
    baseUrl: 'https://unisat.io',
    description: 'Leading Bitcoin wallet & marketplace',
    color: 'orange',
    features: ['Zero fees', 'Instant mint', 'Secure wallet']
  },
  ordswap: {
    name: 'OrdSwap',
    icon: '⚡',
    baseUrl: 'https://ordswap.io',
    description: 'Professional trading platform',
    color: 'blue',
    features: ['Pro tools', 'Advanced charts', 'Low fees']
  },
  magiceden: {
    name: 'Gamma.io',
    icon: '🟢',
    baseUrl: 'https://gamma.io/ordinals/collections',
    description: 'Premier Bitcoin NFT marketplace',
    color: 'green',
    features: ['Curated collections', 'Analytics', 'Bitcoin native']
  },
  ordinalsbot: {
    name: 'OrdinalsBot',
    icon: '🤖',
    baseUrl: 'https://ordinalsbot.com',
    description: 'Automated inscriptions',
    color: 'green',
    features: ['Bulk mint', 'API access', 'Custom orders']
  },
  gamma: {
    name: 'Gamma',
    icon: '🔥',
    baseUrl: 'https://gamma.io',
    description: 'Next-gen Bitcoin marketplace',
    color: 'red',
    features: ['DeFi integration', 'Yield farming', 'Governance']
  },
  ordinalswalletpro: {
    name: 'Ordinals Wallet',
    icon: '💎',
    baseUrl: 'https://ordinalswallet.com',
    description: 'Professional Bitcoin tools',
    color: 'indigo',
    features: ['Portfolio tracking', 'Tax reports', 'Multi-sig']
  }
};

export function MintPlatform({ 
  platform, 
  tokenSymbol, 
  tokenType, 
  size = 'md', 
  showIcon = true 
}: MintPlatformProps) {
  const platformData = MINT_PLATFORMS[platform as keyof typeof MINT_PLATFORMS];
  
  if (!platformData) {
    return null;
  }

  const generateMintUrl = () => {
    const baseUrl = platformData.baseUrl;
    
    switch (platform) {
      case 'unisat':
        if (tokenType === 'brc20' && tokenSymbol) {
          return `${baseUrl}/market/brc20?tick=${tokenSymbol}`;
        }
        if (tokenType === 'rune' && tokenSymbol) {
          return `${baseUrl}/runes/marketplace?symbol=${tokenSymbol}`;
        }
        return `${baseUrl}/marketplace`;
        
      case 'ordswap':
        if (tokenType === 'rune' && tokenSymbol) {
          return `${baseUrl}/runes/${tokenSymbol}`;
        }
        return `${baseUrl}/marketplace`;
        
      case 'magiceden':
        if (tokenSymbol) {
          return `${baseUrl}/collections/${tokenSymbol}`;
        }
        return baseUrl;
        
      case 'ordinalsbot':
        return `${baseUrl}/inscription`;
        
      case 'gamma':
        return `${baseUrl}/ordinals`;
        
      default:
        return baseUrl;
    }
  };

  const colorClasses = {
    orange: 'border-orange-500 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white',
    blue: 'border-blue-500 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white',
    purple: 'border-purple-500 bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white',
    green: 'border-green-500 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white',
    red: 'border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white',
    indigo: 'border-indigo-500 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white'
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  };

  const handleMintClick = () => {
    const url = generateMintUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (size === 'sm') {
    return (
      <Button
        onClick={handleMintClick}
        variant="outline"
        size="sm"
        className={`${colorClasses[platformData.color as keyof typeof colorClasses]} ${sizeClasses[size]} font-mono transition-all duration-200`}
      >
        {showIcon && <span className="mr-1">{platformData.icon}</span>}
        {platformData.name}
        <ExternalLink className="w-3 h-3 ml-1" />
      </Button>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[platformData.color as keyof typeof colorClasses]} transition-all duration-200 cursor-pointer group`} onClick={handleMintClick}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {showIcon && <span className="text-lg">{platformData.icon}</span>}
          <div>
            <h4 className="font-bold font-mono">{platformData.name}</h4>
            <p className="text-xs opacity-80">{platformData.description}</p>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
      </div>
      
      {size === 'lg' && (
        <div className="flex items-center gap-4 text-xs mt-3">
          {platformData.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface MintPlatformGridProps {
  tokenSymbol?: string;
  tokenType: 'rune' | 'brc20' | 'ordinal';
  title?: string;
}

export function MintPlatformGrid({ tokenSymbol, tokenType, title = 'Mint/Trade Platforms' }: MintPlatformGridProps) {
  const platformsByType = {
    rune: ['unisat', 'ordswap', 'magiceden', 'ordinalsbot'] as const,
    brc20: ['unisat', 'ordswap', 'magiceden', 'gamma'] as const,
    ordinal: ['unisat', 'magiceden', 'ordinalsbot', 'gamma'] as const
  };

  const platforms = platformsByType[tokenType];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white font-mono">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => (
          <MintPlatform
            key={platform}
            platform={platform}
            tokenSymbol={tokenSymbol}
            tokenType={tokenType}
            size="md"
            showIcon={true}
          />
        ))}
      </div>
    </div>
  );
}