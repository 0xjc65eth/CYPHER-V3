/**
 * BestInSlot API v3 Integration
 * Real-time Bitcoin Ordinals data (inscriptions, collections, market activity)
 * Free tier: 15,000 requests/day
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BISInscription {
  inscription_id: string;
  inscription_number: number;
  content_type: string;
  content_length: number;
  genesis_fee: number;
  genesis_height: number;
  genesis_timestamp: number;
  genesis_tx_id: string;
  address: string;
  output_value: number;
  sat_ordinal: number;
  sat_rarity: string;
  collection_slug?: string;
  collection_name?: string;
}

export interface BISCollection {
  slug: string;
  name: string;
  description?: string;
  image_url?: string;
  banner_url?: string;
  supply: number;
  inscription_icon?: string;
}

export interface BISCollectionStats {
  slug: string;
  floor_price: number; // in sats
  market_cap: number;
  total_volume: number;
  volume_24h: number;
  volume_7d: number;
  volume_30d: number;
  sales_24h: number;
  sales_7d: number;
  sales_30d: number;
  owners: number;
  listed: number;
  change_24h: number;
  change_7d: number;
  change_30d: number;
  avg_price_24h: number;
}

export interface BISCollectionRanking {
  slug: string;
  name: string;
  image_url?: string;
  floor_price: number;
  volume: number;
  sales: number;
  owners: number;
  supply: number;
  listed: number;
  change: number;
  market_cap: number;
}

export interface BISActivity {
  inscription_id: string;
  inscription_number: number;
  activity_type: 'sale' | 'listing' | 'transfer' | 'cancel_listing';
  price?: number; // in sats
  from_address: string;
  to_address: string;
  tx_id: string;
  block_height: number;
  timestamp: number;
  collection_slug?: string;
  marketplace?: string;
}

export interface BISWalletInscription {
  inscription_id: string;
  inscription_number: number;
  content_type: string;
  collection_slug?: string;
  collection_name?: string;
  floor_price?: number;
}

export interface BISWalletHolding {
  collection_slug: string;
  collection_name: string;
  count: number;
  floor_price: number;
  total_value: number;
  image_url?: string;
}

export interface BISBlockInfo {
  block_height: number;
  block_hash: string;
  block_timestamp: number;
  inscription_count: number;
}

// ─── API Client ─────────────────────────────────────────────────────────────

export class BestInSlotAPI {
  private baseUrl = 'https://api.bestinslot.xyz/v3';
  private apiKey: string | null;
  private cache: Map<string, { data: unknown; timestamp: number; ttl: number }> = new Map();
  private rateLimiter: Map<string, number> = new Map();
  private readonly RATE_LIMIT_MS = 200; // 200ms between requests (safe for 15k/day)
  private readonly DEFAULT_TTL = 30_000; // 30s default cache

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BESTINSLOT_API_KEY || null;
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  // ─── HTTP Layer ─────────────────────────────────────────────────────────

  private async rateLimitedFetch(url: string): Promise<Response> {
    if (!this.apiKey) {
      throw new Error('BestInSlot API key not configured');
    }

    const now = Date.now();
    const lastRequest = this.rateLimiter.get('global') || 0;
    const wait = this.RATE_LIMIT_MS - (now - lastRequest);
    if (wait > 0) {
      await new Promise(resolve => setTimeout(resolve, wait));
    }
    this.rateLimiter.set('global', Date.now());

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': this.apiKey,
        'User-Agent': 'CYPHER-ORDi-Future-V3',
      },
    });

    if (!response.ok) {
      throw new Error(`BestInSlot API error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: unknown, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  // ─── Block Endpoints ────────────────────────────────────────────────────

  async getLatestBlock(): Promise<BISBlockInfo | null> {
    const cacheKey = 'latest-block';
    const cached = this.getCached<BISBlockInfo>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.rateLimitedFetch(`${this.baseUrl}/block/latest`);
      const json = await res.json();
      const data = json.data || json;
      this.setCache(cacheKey, data, 15_000); // 15s cache
      return data;
    } catch (error) {
      console.error('[BestInSlot] getLatestBlock error:', error);
      return null;
    }
  }

  // ─── Inscription Endpoints ──────────────────────────────────────────────

  async getInscriptionsInBlock(blockHeight: number): Promise<BISInscription[]> {
    const cacheKey = `inscriptions-block-${blockHeight}`;
    const cached = this.getCached<BISInscription[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.rateLimitedFetch(
        `${this.baseUrl}/inscription/in_block?block_height=${blockHeight}`
      );
      const json = await res.json();
      const data = json.data || json || [];
      this.setCache(cacheKey, data, 60_000); // 1 min (block data is immutable)
      return data;
    } catch (error) {
      console.error(`[BestInSlot] getInscriptionsInBlock error for block ${blockHeight}:`, error);
      return [];
    }
  }

  async getInscription(inscriptionId: string): Promise<BISInscription | null> {
    const cacheKey = `inscription-${inscriptionId}`;
    const cached = this.getCached<BISInscription>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.rateLimitedFetch(
        `${this.baseUrl}/inscription/single?inscription_id=${encodeURIComponent(inscriptionId)}`
      );
      const json = await res.json();
      const data = json.data || json;
      this.setCache(cacheKey, data, 60_000);
      return data;
    } catch (error) {
      console.error(`[BestInSlot] getInscription error for ${inscriptionId}:`, error);
      return null;
    }
  }

  async getLatestInscriptions(count = 24): Promise<BISInscription[]> {
    // Get latest block, then fetch inscriptions from recent blocks
    const latestBlock = await this.getLatestBlock();
    if (!latestBlock) return [];

    const height = latestBlock.block_height;
    // Fetch from last 3 blocks to get enough inscriptions
    const promises = [
      this.getInscriptionsInBlock(height),
      this.getInscriptionsInBlock(height - 1),
      this.getInscriptionsInBlock(height - 2),
    ];

    const results = await Promise.allSettled(promises);
    const all: BISInscription[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') all.push(...r.value);
    }

    // Sort by number descending, take requested count
    all.sort((a, b) => b.inscription_number - a.inscription_number);
    return all.slice(0, count);
  }

  // ─── Collection Endpoints ───────────────────────────────────────────────

  async getCollectionRankings(
    sortBy: 'volume' | 'sales' | 'floor_price' = 'volume',
    timeFrame: '24h' | '7d' | '30d' | 'all' = '24h',
    count = 20
  ): Promise<BISCollectionRanking[]> {
    const cacheKey = `rankings-${sortBy}-${timeFrame}-${count}`;
    const cached = this.getCached<BISCollectionRanking[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.rateLimitedFetch(
        `${this.baseUrl}/collection/rankings?sort_by=${sortBy}&time_frame=${timeFrame}&count=${count}`
      );
      const json = await res.json();
      const data = json.data || json || [];
      this.setCache(cacheKey, data, 120_000); // 2 min
      return data;
    } catch (error) {
      console.error('[BestInSlot] getCollectionRankings error:', error);
      return [];
    }
  }

  async getCollectionInfo(slug: string): Promise<BISCollection | null> {
    const cacheKey = `collection-info-${slug}`;
    const cached = this.getCached<BISCollection>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.rateLimitedFetch(
        `${this.baseUrl}/collection/info?slug=${encodeURIComponent(slug)}`
      );
      const json = await res.json();
      const data = json.data || json;
      this.setCache(cacheKey, data, 300_000); // 5 min
      return data;
    } catch (error) {
      console.error(`[BestInSlot] getCollectionInfo error for ${slug}:`, error);
      return null;
    }
  }

  async getCollectionStats(slug: string): Promise<BISCollectionStats | null> {
    const cacheKey = `collection-stats-${slug}`;
    const cached = this.getCached<BISCollectionStats>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.rateLimitedFetch(
        `${this.baseUrl}/collection/stats?slug=${encodeURIComponent(slug)}`
      );
      const json = await res.json();
      const data = json.data || json;
      this.setCache(cacheKey, data, 60_000); // 1 min
      return data;
    } catch (error) {
      console.error(`[BestInSlot] getCollectionStats error for ${slug}:`, error);
      return null;
    }
  }

  // ─── Market Activity Endpoints ──────────────────────────────────────────

  async getCollectionActivity(
    slug: string,
    activityType: 'sale' | 'listing' | 'transfer' | 'cancel_listing' = 'sale',
    count = 50
  ): Promise<BISActivity[]> {
    const cacheKey = `activity-${slug}-${activityType}-${count}`;
    const cached = this.getCached<BISActivity[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.rateLimitedFetch(
        `${this.baseUrl}/collection/activity?slug=${encodeURIComponent(slug)}&activity_type=${activityType}&count=${count}`
      );
      const json = await res.json();
      const data = json.data || json || [];
      this.setCache(cacheKey, data, 15_000); // 15s for activity
      return data;
    } catch (error) {
      console.error(`[BestInSlot] getCollectionActivity error for ${slug}:`, error);
      return [];
    }
  }

  async getRecentActivity(count = 50): Promise<BISActivity[]> {
    // Get activity from top collections
    const rankings = await this.getCollectionRankings('volume', '24h', 5);
    if (rankings.length === 0) return [];

    const promises = rankings.slice(0, 3).map(c =>
      this.getCollectionActivity(c.slug, 'sale', Math.ceil(count / 3))
    );

    const results = await Promise.allSettled(promises);
    const all: BISActivity[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') all.push(...r.value);
    }

    all.sort((a, b) => b.timestamp - a.timestamp);
    return all.slice(0, count);
  }

  // ─── Wallet Endpoints ───────────────────────────────────────────────────

  async getWalletInscriptions(address: string, count = 50): Promise<BISWalletInscription[]> {
    const cacheKey = `wallet-inscriptions-${address}-${count}`;
    const cached = this.getCached<BISWalletInscription[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.rateLimitedFetch(
        `${this.baseUrl}/wallet/inscriptions?address=${encodeURIComponent(address)}&count=${count}`
      );
      const json = await res.json();
      const data = json.data || json || [];
      this.setCache(cacheKey, data, 30_000); // 30s
      return data;
    } catch (error) {
      console.error(`[BestInSlot] getWalletInscriptions error for ${address}:`, error);
      return [];
    }
  }

  async getWalletHoldings(address: string): Promise<BISWalletHolding[]> {
    const cacheKey = `wallet-holdings-${address}`;
    const cached = this.getCached<BISWalletHolding[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.rateLimitedFetch(
        `${this.baseUrl}/wallet/collection_holdings?address=${encodeURIComponent(address)}`
      );
      const json = await res.json();
      const data = json.data || json || [];
      this.setCache(cacheKey, data, 30_000);
      return data;
    } catch (error) {
      console.error(`[BestInSlot] getWalletHoldings error for ${address}:`, error);
      return [];
    }
  }
}

// Singleton instance
export const bestInSlotAPI = new BestInSlotAPI();
