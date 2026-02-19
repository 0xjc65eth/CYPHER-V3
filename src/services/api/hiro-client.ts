/**
 * Hiro API Client
 * Real-time ordinals and BRC-20 data from Hiro
 */

export class HiroClient {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.HIRO_API_KEY || '';
    this.baseURL = process.env.NEXT_PUBLIC_HIRO_API_URL || 'https://api.hiro.so/ordinals/v1';
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });

    if (!response.ok) {
      throw new Error(`Hiro API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getInscriptions(offset = 0, limit = 60) {
    return this.request(`/inscriptions?offset=${offset}&limit=${limit}`);
  }

  async getInscription(id: string) {
    return this.request(`/inscriptions/${id}`);
  }

  async getInscriptionContent(id: string) {
    return this.request(`/inscriptions/${id}/content`);
  }

  async getInscriptionTransfers(id: string, offset = 0, limit = 20) {
    return this.request(`/inscriptions/${id}/transfers?offset=${offset}&limit=${limit}`);
  }

  async getSatoshi(ordinal: number) {
    return this.request(`/sats/${ordinal}`);
  }

  async getSatoshiInscriptions(ordinal: number) {
    return this.request(`/sats/${ordinal}/inscriptions`);
  }

  async getBRC20Tokens(offset = 0, limit = 20) {
    return this.request(`/brc-20/tokens?offset=${offset}&limit=${limit}`);
  }

  async getBRC20Token(ticker: string) {
    return this.request(`/brc-20/tokens/${ticker}`);
  }

  async getBRC20TokenHolders(ticker: string, offset = 0, limit = 20) {
    return this.request(`/brc-20/tokens/${ticker}/holders?offset=${offset}&limit=${limit}`);
  }

  async getBRC20Activity(ticker?: string, offset = 0, limit = 20) {
    const tickerParam = ticker ? `&ticker=${ticker}` : '';
    return this.request(`/brc-20/activity?offset=${offset}&limit=${limit}${tickerParam}`);
  }

  async getBRC20Balances(address: string, offset = 0, limit = 20) {
    return this.request(`/brc-20/balances/${address}?offset=${offset}&limit=${limit}`);
  }

  async getStats(type: 'inscriptions' | 'brc-20' = 'inscriptions') {
    return this.request(`/stats/${type}`);
  }

  async searchInscriptions(params: {
    term?: string;
    address?: string;
    mime_type?: string[];
    rarity?: string[];
    recursive?: boolean;
    cursed?: boolean;
    from_genesis_height?: number;
    to_genesis_height?: number;
    from_sat_ordinal?: number;
    to_sat_ordinal?: number;
    from_sat_coinbase_height?: number;
    to_sat_coinbase_height?: number;
    from_number?: number;
    to_number?: number;
    offset?: number;
    limit?: number;
    order?: 'asc' | 'desc';
    order_by?: 'genesis_block_height' | 'ordinal' | 'rarity';
  }) {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    return this.request(`/inscriptions?${queryParams}`);
  }

  async getAddressActivity(address: string, offset = 0, limit = 20) {
    return this.request(`/activity?address=${address}&offset=${offset}&limit=${limit}`);
  }

  // Utility method to get inscription image URL
  getInscriptionImageUrl(inscriptionId: string): string {
    return `${this.baseURL}/inscriptions/${inscriptionId}/content`;
  }

  // Get thumbnail URL for inscription
  getInscriptionThumbnailUrl(inscriptionId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    const sizeMap = {
      small: 150,
      medium: 300,
      large: 600
    };
    return `${this.baseURL}/inscriptions/${inscriptionId}/thumbnail?size=${sizeMap[size]}`;
  }
}