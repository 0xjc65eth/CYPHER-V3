/**
 * Ordinals Data Aggregator - CYPHER V3
 * Aggregates Ordinals data from multiple sources with automatic fallback
 *
 * Data Sources Priority (post-ME deprecation):
 * 1. OKX (primary) - marketplace API with full Ordinals coverage
 * 2. UniSat (fallback) - direct API with auth
 * 3. Hiro (fallback) - blockchain/inscription data
 * 4. Magic Eden (last resort) - deprecated, rate-limited
 *
 * IMPORTANT: All fetch() calls use ABSOLUTE URLs, not relative /api/ paths
 * (relative paths don't work server-side in Next.js API routes)
 */

import { magicEdenService } from '../magicEdenService';

interface AggregatedCollection {
  symbol: string;
  name: string;
  floor: number;
  floorUSD: number;
  volume: number;       // all-time volume in BTC
  volume24h: number;
  volume7d: number;
  volumeUSD24h: number;
  listed: number;
  owners: number;
  supply: number;
  imageURI: string | null;
  change: number;
  change7d: number;
  change30d: number;
  bestBid?: number;
  bidAskSpread?: number;
  vwap24h?: number;
  trades24h?: number;
  dataSource: 'magic_eden' | 'unisat' | 'okx' | 'hiro' | 'mixed';
}

// Hard-coded collection names for fallback sources
const COLLECTION_NAMES: Record<string, string> = {
  'bitcoin-punks': 'Bitcoin Punks',
  'nodemonkes': 'NodeMonkes',
  'bitcoin-puppets': 'Bitcoin Puppets',
  'quantum-cats': 'Quantum Cats',
  'ordinal-maxi-biz': 'Ordinal Maxi Biz (OMB)',
  'runestones': 'Runestone',
  'bitmap': 'Bitmap',
  'ink': 'Ink',
  'pizza-ninjas': 'Pizza Ninjas',
  'taproot-wizards': 'Taproot Wizards',
  'bitcoin-frogs': 'Bitcoin Frogs',
  'natcats': 'Natcats',
  'rsic': 'RSIC',
  'degods-btc': 'DeGods',
  'ordinal-punks': 'Ordinal Punks',
};

export class OrdinalsDataAggregator {
  private static readonly POPULAR_COLLECTIONS = [
    'bitcoin-punks',
    'nodemonkes',
    'bitcoin-puppets',
    'quantum-cats',
    'ordinal-maxi-biz',
    'runestones',
    'bitmap',
    'ink',
    'pizza-ninjas',
    'taproot-wizards',
    'bitcoin-frogs',
    'natcats',
    'rsic',
    'degods-btc',
    'ordinal-punks',
  ];

  /**
   * Fetch collections from all available sources with automatic fallback
   */
  static async fetchCollections(): Promise<AggregatedCollection[]> {

    // Try OKX first (primary source post-ME deprecation)
    try {
      const okxData = await this.fetchFromOKX();
      if (okxData.length > 0) {
        return okxData;
      }
    } catch (error) {
    }

    // Fallback to UniSat
    try {
      const uniSatData = await this.fetchFromUniSat();
      if (uniSatData.length > 0) {
        return uniSatData;
      }
    } catch (error) {
    }

    // Fallback to Hiro
    try {
      const hiroData = await this.fetchFromHiro();
      if (hiroData.length > 0) {
        return hiroData;
      }
    } catch (error) {
    }

    // Last resort: Magic Eden (deprecated, rate-limited)
    try {
      const magicEdenData = await this.fetchFromMagicEden();
      if (magicEdenData.length > 0) {
        return magicEdenData;
      }
    } catch (error) {
      console.error('[OrdinalsDataAggregator] All API sources failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // If all sources fail, return empty array
    console.error('[OrdinalsDataAggregator] All data sources failed, returning empty array');
    return [];
  }

  /**
   * Fetch from Magic Eden (primary source) - stat-only, no details calls
   * Uses batches of 3 with 1s delays to avoid 429s
   */
  private static async fetchFromMagicEden(): Promise<AggregatedCollection[]> {
    const collections: AggregatedCollection[] = [];
    const BATCH_SIZE = 3;

    for (let i = 0; i < this.POPULAR_COLLECTIONS.length; i += BATCH_SIZE) {
      const batch = this.POPULAR_COLLECTIONS.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (symbol) => {
          const stats = await magicEdenService.getCollectionStats(symbol);
          return { symbol, stats };
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value.stats) {
          const { symbol, stats } = result.value;
          const floorBTC = this.satsToBTC(stats.floorPrice);
          const totalVolumeBTC = this.satsToBTC(stats.totalVolume);

          // Sanitize owners
          const rawOwners = Number(stats.owners ?? 0);
          const owners = (Number.isFinite(rawOwners) && rawOwners > 0 && rawOwners < 1_000_000)
            ? Math.round(rawOwners)
            : 0;

          collections.push({
            symbol,
            name: COLLECTION_NAMES[symbol] || symbol,
            floor: floorBTC,
            floorUSD: 0,
            volume: totalVolumeBTC,
            volume24h: 0,
            volume7d: 0,
            volumeUSD24h: 0,
            listed: stats.listedCount ?? stats.totalListed ?? 0,
            owners,
            supply: stats.supply ?? 0,
            imageURI: `https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_${symbol}_pfp`,
            change: 0,
            change7d: 0,
            change30d: 0,
            bestBid: floorBTC,
            bidAskSpread: 0,
            vwap24h: 0,
            trades24h: 0,
            dataSource: 'magic_eden',
          });
        }
      }

      // 1 second delay between batches
      if (i + BATCH_SIZE < this.POPULAR_COLLECTIONS.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return collections;
  }

  /**
   * Fetch from UniSat (fallback source) - ABSOLUTE URL, direct API
   */
  private static async fetchFromUniSat(): Promise<AggregatedCollection[]> {
    const apiKey = process.env.UNISAT_API_KEY;
    if (!apiKey) {
      return [];
    }

    // Try the v3 market collection list endpoint first
    const endpoints = [
      'https://open-api.unisat.io/v3/market/collection/auction/collection_list',
      'https://open-api.unisat.io/v1/indexer/collection/list',
    ];

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          continue;
        }

        const json = await response.json();
        // UniSat wraps data in { code, msg, data } format
        const data = json.data || json;
        const items = Array.isArray(data) ? data : (data?.list || data?.collections || []);

        if (!Array.isArray(items) || items.length === 0) {
          continue;
        }


        return items.slice(0, 20).map((c: Record<string, unknown>) => ({
          symbol: (c.collectionId || c.symbol || String(c.name || 'unknown').toLowerCase().replace(/\s+/g, '-')) as string,
          name: (c.name || c.symbol || 'Unknown') as string,
          floor: this.satsToBTC(Number(c.floorPrice || 0)),
          floorUSD: 0,
          volume: this.satsToBTC(Number(c.totalVolume || c.volume || 0)),
          volume24h: this.satsToBTC(Number(c.volume24h || c.h24Volume || 0)),
          volume7d: this.satsToBTC(Number(c.volume7d || 0)),
          volumeUSD24h: 0,
          listed: Number(c.listed || c.listedCount || 0),
          owners: Number(c.owners || c.holderTotal || c.ownerCount || 0),
          supply: Number(c.supply || c.totalSupply || 0),
          imageURI: (c.icon || c.image || c.imageURI || null) as string | null,
          change: 0,
          change7d: 0,
          change30d: 0,
          dataSource: 'unisat' as const,
        }));
      } catch (error) {
        continue;
      }
    }

    return [];
  }

  /**
   * Fetch from OKX (fallback source) - ABSOLUTE URL, direct API
   */
  private static async fetchFromOKX(): Promise<AggregatedCollection[]> {
    try {
      const response = await fetch(
        'https://www.okx.com/api/v5/mktplace/nft/ordinals/collection-list',
        {
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        throw new Error(`OKX API returned ${response.status}`);
      }

      const json = await response.json();
      // OKX wraps data in { code, msg, data }
      const data = json.data || json;
      const items = Array.isArray(data) ? data : (data?.list || data?.collections || []);

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('No collections returned from OKX');
      }


      return items.slice(0, 20).map((c: Record<string, unknown>) => ({
        symbol: (c.collectionId || c.slug || c.symbol || 'unknown') as string,
        name: (c.name || c.collectionName || c.symbol || 'Unknown') as string,
        floor: parseFloat(String(c.floorPrice || '0')),
        floorUSD: 0,
        volume: parseFloat(String(c.totalVolume || '0')),
        volume24h: parseFloat(String(c.volume24h || '0')),
        volume7d: parseFloat(String(c.volume7d || '0')),
        volumeUSD24h: 0,
        listed: Number(c.listedCount || 0),
        owners: Number(c.ownerCount || 0),
        supply: Number(c.totalSupply || 0),
        imageURI: (c.logoUrl || c.imageUrl || null) as string | null,
        change: 0,
        change7d: 0,
        change30d: 0,
        bestBid: parseFloat(String(c.floorPrice || '0')),
        bidAskSpread: 0,
        vwap24h: 0,
        trades24h: 0,
        dataSource: 'okx' as const,
      }));
    } catch (error) {
      console.error('[OrdinalsDataAggregator] OKX fetch error:', error instanceof Error ? error.message : 'Unknown');
      return [];
    }
  }

  /**
   * Fetch from Hiro (fallback source) - ABSOLUTE URL, direct API
   */
  private static async fetchFromHiro(): Promise<AggregatedCollection[]> {
    const apiKey = process.env.HIRO_API_KEY;

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (apiKey) {
        headers['x-hiro-api-key'] = apiKey;
      }

      // Try the ordinals inscriptions stats endpoint
      const response = await fetch(
        'https://api.hiro.so/ordinals/v1/inscriptions?limit=20&order_by=genesis_block_height&order=desc',
        {
          headers,
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        throw new Error(`Hiro API returned ${response.status}`);
      }

      const json = await response.json();
      const results = json.results || json.data || [];

      if (!Array.isArray(results) || results.length === 0) {
        throw new Error('No inscription data returned from Hiro');
      }


      // Hiro returns individual inscriptions, not collections - group by collection if possible
      // This is limited data but better than nothing as a last-resort fallback
      const collectionMap = new Map<string, AggregatedCollection>();

      for (const item of results) {
        const collectionId = (item.collection_id || item.meta?.collection || 'unknown') as string;
        if (collectionId === 'unknown') continue;

        if (!collectionMap.has(collectionId)) {
          collectionMap.set(collectionId, {
            symbol: collectionId,
            name: COLLECTION_NAMES[collectionId] || collectionId,
            floor: 0,
            floorUSD: 0,
            volume: 0,
            volume24h: 0,
            volume7d: 0,
            volumeUSD24h: 0,
            listed: 0,
            owners: 0,
            supply: Number(item.total_supply || 0),
            imageURI: (item.content_url || null) as string | null,
            change: 0,
            change7d: 0,
            change30d: 0,
            dataSource: 'hiro' as const,
          });
        }
      }

      return Array.from(collectionMap.values());
    } catch (error) {
      console.error('[OrdinalsDataAggregator] Hiro fetch error:', error instanceof Error ? error.message : 'Unknown');
      return [];
    }
  }

  /**
   * Convert satoshis to BTC
   */
  private static satsToBTC(sats: number): number {
    if (!sats || sats <= 0) return 0;
    return sats / 1e8;
  }
}
