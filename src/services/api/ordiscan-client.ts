/**
 * Ordiscan API Client
 * Real-time ordinals data from Ordiscan
 */

export class OrdiscanClient {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.ORDISCAN_API_KEY || '';
    this.baseURL = process.env.NEXT_PUBLIC_ORDISCAN_API_URL || 'https://api.ordiscan.com/v1';
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });

    if (!response.ok) {
      throw new Error(`Ordiscan API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getInscription(inscriptionId: string) {
    return this.request(`/inscription/${inscriptionId}`);
  }

  async getAddressInscriptions(address: string, page = 1, limit = 20) {
    return this.request(`/address/${address}/inscriptions?page=${page}&limit=${limit}`);
  }

  async getAddressRunes(address: string) {
    return this.request(`/address/${address}/runes`);
  }

  async getCollections(limit = 20, offset = 0) {
    return this.request(`/collections?limit=${limit}&offset=${offset}`);
  }

  async getCollection(slug: string) {
    return this.request(`/collection/${slug}`);
  }

  async getCollectionInscriptions(slug: string, page = 1, limit = 20) {
    return this.request(`/collection/${slug}/inscriptions?page=${page}&limit=${limit}`);
  }

  async getMarketplaceListings(params: {
    collection?: string;
    sort?: 'price_asc' | 'price_desc' | 'recent';
    limit?: number;
    offset?: number;
  } = {}) {
    const queryParams = new URLSearchParams({
      limit: (params.limit || 20).toString(),
      offset: (params.offset || 0).toString(),
      ...(params.collection && { collection: params.collection }),
      ...(params.sort && { sort: params.sort })
    });

    return this.request(`/marketplace/listings?${queryParams}`);
  }

  async getMarketplaceStats() {
    return this.request('/marketplace/stats');
  }

  async getRunesList(limit = 50, offset = 0) {
    return this.request(`/runes?limit=${limit}&offset=${offset}`);
  }

  async getRune(runeName: string) {
    return this.request(`/rune/${runeName}`);
  }

  async getRuneHolders(runeName: string, limit = 100) {
    return this.request(`/rune/${runeName}/holders?limit=${limit}`);
  }

  async getRuneActivity(runeName: string, limit = 50) {
    return this.request(`/rune/${runeName}/activity?limit=${limit}`);
  }

  async getSatributes(inscriptionId: string) {
    return this.request(`/inscription/${inscriptionId}/satributes`);
  }

  async getBRC20Tokens(limit = 50) {
    return this.request(`/brc20/tokens?limit=${limit}`);
  }

  async getBRC20Token(ticker: string) {
    return this.request(`/brc20/token/${ticker}`);
  }

  async getBRC20Holders(ticker: string, limit = 100) {
    return this.request(`/brc20/token/${ticker}/holders?limit=${limit}`);
  }

  async getStats() {
    return this.request('/stats');
  }

  async search(query: string) {
    return this.request(`/search?q=${encodeURIComponent(query)}`);
  }
}