'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/primitives/Card'
import { Badge } from '@/components/ui/primitives/Badge'
import { rareSatsService } from '@/services/rare-sats/RareSatsService'

export default function RarityGuide() {
  const rarities = [
    {
      level: 'common' as const,
      title: 'Common',
      description: 'Any sat that is not the first sat of its block',
      frequency: 'Every sat except block firsts',
      supply: '~2.1 Quadrillion',
      premium: '0x',
    },
    {
      level: 'uncommon' as const,
      title: 'Uncommon',
      description: 'The first sat of each block',
      frequency: 'Every ~10 minutes',
      supply: '~6.93 Million',
      premium: '5x',
    },
    {
      level: 'rare' as const,
      title: 'Rare',
      description: 'The first sat of each difficulty adjustment period',
      frequency: 'Every 2,016 blocks (~2 weeks)',
      supply: '~3,437',
      premium: '50x',
    },
    {
      level: 'epic' as const,
      title: 'Epic',
      description: 'The first sat of each halving epoch',
      frequency: 'Every 210,000 blocks (~4 years)',
      supply: '32',
      premium: '500x',
    },
    {
      level: 'legendary' as const,
      title: 'Legendary',
      description: 'The first sat of each cycle (6 halvings)',
      frequency: 'Every 1,260,000 blocks (~24 years)',
      supply: '5',
      premium: '5,000x',
    },
    {
      level: 'mythic' as const,
      title: 'Mythic',
      description: 'The very first sat ever mined (genesis block)',
      frequency: 'Once in Bitcoin history',
      supply: '1',
      premium: '1,000,000x',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>📚 Rarity System Guide</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <p className="text-sm text-gray-400">
            Based on the <strong className="text-white">Ordinal Theory</strong>, every satoshi has a unique serial number and can be classified by its rarity. 
            Rarity is determined by when the sat was mined in Bitcoin's history.
          </p>
        </div>

        <div className="space-y-3">
          {rarities.map((rarity) => (
            <div
              key={rarity.level}
              className="p-4 bg-[#0a0a0f] border rounded hover:border-[#f59e0b]/30 transition-colors"
              style={{ borderColor: `${rareSatsService.getRarityColor(rarity.level)}40` }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{rareSatsService.getRarityEmoji(rarity.level)}</span>
                  <h3 
                    className="text-lg font-bold"
                    style={{ color: rareSatsService.getRarityColor(rarity.level) }}
                  >
                    {rarity.title}
                  </h3>
                </div>
                <Badge
                  variant={
                    rarity.level === 'mythic' ? 'danger' :
                    rarity.level === 'legendary' ? 'warning' :
                    rarity.level === 'epic' ? 'new' :
                    rarity.level === 'rare' ? 'info' :
                    rarity.level === 'uncommon' ? 'success' :
                    'default'
                  }
                  size="sm"
                >
                  {rarity.premium} Premium
                </Badge>
              </div>

              <p className="text-sm text-gray-400 mb-3">{rarity.description}</p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Frequency:</span>
                  <div className="text-white font-medium mt-1">{rarity.frequency}</div>
                </div>
                <div>
                  <span className="text-gray-500">Supply:</span>
                  <div className="text-white font-medium mt-1">{rarity.supply}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            <div className="text-xs text-[#f59e0b]">
              <strong>Note:</strong> Prices are estimates based on historical market data and rarity premiums. 
              Actual values may vary based on demand, cultural significance, and collector interest.
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
            </svg>
            <div className="text-xs text-purple-400">
              <strong>Learn more:</strong> Visit{' '}
              <a 
                href="https://docs.ordinals.com/overview.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-purple-300"
              >
                Ordinals Documentation
              </a>
              {' '}for detailed information about Ordinal Theory and rare satoshis.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
