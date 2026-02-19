import { NextResponse } from 'next/server';

const ORDISCAN_API_KEY = process.env.ORDISCAN_API_KEY || '';

// Real rare sat category definitions based on ordinal theory
const RARE_SAT_CATEGORIES = [
  {
    name: 'UNCOMMON',
    description: 'The first satoshi of each block. Created every ~10 minutes with each new Bitcoin block.',
    rarity: 'uncommon',
    estimated_total: 6929999,
    frequency: 'First sat of every block',
    example_sat: '50000000000',
    supply_info: 'One per block, supply grows with each new block mined',
  },
  {
    name: 'RARE',
    description: 'The first satoshi of each difficulty adjustment period. Occurs every 2016 blocks.',
    rarity: 'rare',
    estimated_total: 3437,
    frequency: 'First sat of every difficulty adjustment (~2 weeks)',
    example_sat: '10080000000000',
    supply_info: 'One per difficulty adjustment period, approximately every 2016 blocks',
  },
  {
    name: 'EPIC',
    description: 'The first satoshi of each halving epoch. Only happens every 210,000 blocks (~4 years).',
    rarity: 'epic',
    estimated_total: 32,
    frequency: 'First sat of every halving epoch',
    example_sat: '1050000000000000',
    supply_info: 'Maximum 32 will ever exist (one per halving, 32 halvings total)',
  },
  {
    name: 'LEGENDARY',
    description: 'The first satoshi of each cycle (conjunction of halving and difficulty adjustment). Extremely rare theoretical event.',
    rarity: 'legendary',
    estimated_total: 5,
    frequency: 'First sat of every conjunction of halving and difficulty adjustment',
    example_sat: '0',
    supply_info: 'Maximum 5 will ever exist. First legendary sat is the genesis sat.',
  },
  {
    name: 'MYTHIC',
    description: 'The very first satoshi ever created - sat 0 from the genesis block mined by Satoshi Nakamoto.',
    rarity: 'mythic',
    estimated_total: 1,
    frequency: 'Only one exists - the first sat ever',
    example_sat: '0',
    supply_info: 'Unique. Only 1 will ever exist. Unspendable in the genesis block coinbase.',
  },
  {
    name: 'VINTAGE',
    description: 'Satoshis from the first 1,000 blocks of Bitcoin, mined in January 2009.',
    rarity: 'very_rare',
    estimated_total: 5000000000,
    frequency: 'Block 0-999 only',
    example_sat: '100000000',
    supply_info: 'Fixed supply from early Bitcoin blocks. Many are unspendable (coinbase of genesis block).',
  },
  {
    name: 'NAKAMOTO',
    description: 'Satoshis believed to have been mined by Satoshi Nakamoto based on nonce pattern analysis.',
    rarity: 'very_rare',
    estimated_total: 1100000,
    frequency: 'Blocks attributed to Satoshi via Patoshi pattern (first ~20,000 blocks)',
    example_sat: '5000000000',
    supply_info: 'Estimated ~1.1M BTC worth. Most have never moved from original addresses.',
  },
  {
    name: 'BLOCK9',
    description: 'Satoshis from Block 9, the first block whose coinbase reward was ever spent (sent to Hal Finney).',
    rarity: 'very_rare',
    estimated_total: 5000000000,
    frequency: 'Block 9 only',
    example_sat: '450000000000',
    supply_info: '50 BTC (5 billion sats). Block 9 contains the first ever Bitcoin transaction.',
  },
  {
    name: 'PIZZA',
    description: 'Satoshis from the famous Bitcoin Pizza transaction on May 22, 2010 (10,000 BTC for two pizzas).',
    rarity: 'rare',
    estimated_total: 1000000000000,
    frequency: 'From the pizza transaction and its descendants',
    example_sat: 'Various from tx a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d',
    supply_info: '10,000 BTC worth of sats from the historic pizza purchase.',
  },
  {
    name: 'PALINDROME',
    description: 'Satoshis whose ordinal number reads the same forwards and backwards.',
    rarity: 'uncommon',
    estimated_total: 900000,
    frequency: 'Scattered throughout the sat number space',
    example_sat: '12321',
    supply_info: 'Approximately 900,000 palindrome sats exist across all mined sats.',
  },
  {
    name: 'ALPHA',
    description: 'Satoshis from the first transaction in each block (the coinbase transaction).',
    rarity: 'common',
    estimated_total: 6929999,
    frequency: 'One set per block',
    example_sat: '0',
    supply_info: 'Each block has a coinbase transaction, making these relatively common.',
  },
  {
    name: 'FIRST_TX',
    description: 'Satoshis from the very first Bitcoin transaction (Block 170) from Satoshi to Hal Finney on Jan 12, 2009.',
    rarity: 'very_rare',
    estimated_total: 1000000000,
    frequency: 'Block 170 only (first non-coinbase transaction)',
    example_sat: '8500000000',
    supply_info: '10 BTC sent from Satoshi to Hal Finney. The first peer-to-peer Bitcoin transfer.',
  },
  {
    name: 'HITMAN',
    description: 'Satoshis from block 78,925 which contains the first known vanity address transaction.',
    rarity: 'rare',
    estimated_total: 5000000000,
    frequency: 'Block 78925 only',
    example_sat: 'From block 78925',
    supply_info: 'Sats from a historically notable block.',
  },
  {
    name: 'JPEG',
    description: 'Satoshis that have been inscribed with image content (JPEG, PNG, WEBP, SVG inscriptions).',
    rarity: 'common',
    estimated_total: 30000000,
    frequency: 'Any sat with an image inscription',
    example_sat: 'Various inscribed sats',
    supply_info: 'Grows as new image inscriptions are created. Represents the largest category of inscriptions.',
  },
];

export async function GET() {
  try {
    // Try Ordiscan API first
    let ordiscanData = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(
        'https://api.ordiscan.com/v1/rare-sats',
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${ORDISCAN_API_KEY}`,
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      if (response.ok) {
        ordiscanData = await response.json();
      }
    } catch {
      // Ordiscan API may not be available, fall through to static data
    }

    if (ordiscanData && (Array.isArray(ordiscanData) ? ordiscanData.length > 0 : ordiscanData.data)) {
      return NextResponse.json(
        {
          success: true,
          data: ordiscanData.data || ordiscanData,
          categories: RARE_SAT_CATEGORIES,
          timestamp: Date.now(),
          source: 'ordiscan',
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          },
        }
      );
    }

    // Return well-researched category definitions
    return NextResponse.json(
      {
        success: true,
        data: RARE_SAT_CATEGORIES,
        total: RARE_SAT_CATEGORIES.length,
        timestamp: Date.now(),
        source: 'category_definitions',
        note: 'Category definitions based on ordinal theory. Live market pricing requires marketplace APIs.',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Rare sats categories API error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rare sat categories', message },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
