// Cliente TypeScript para as APIs Hiro Runes
import { 
  HiroApiResponse, 
  EtchingsResponse, 
  HoldersResponse, 
  ActivityResponse, 
  PriceDataResponse,
  RuneEtching,
  RuneHolder,
  RuneActivity,
  RunePriceData
} from './hiro-runes-config';

export interface RunesApiConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  debug?: boolean;
}

export interface EtchingsParams {
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  order_by?: 'timestamp' | 'symbol' | 'total_supply' | 'holders';
}

export interface HoldersParams {
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  order_by?: 'balance' | 'timestamp' | 'address';
}

export interface ActivityParams {
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  order_by?: 'timestamp' | 'amount' | 'block_height';
  operation?: 'transfer' | 'mint' | 'burn';
  from_block?: number;
  to_block?: number;
}

export interface PriceDataParams {
  symbols?: string[]; // Array de símbolos de runes
  interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  period?: '1h' | '4h' | '24h' | '7d' | '30d';
  limit?: number;
}

export class RunesApiError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly details?: any;

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message);
    this.name = 'RunesApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class HiroRunesClient {
  private config: Required<RunesApiConfig>;
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor(config: RunesApiConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '/api/runes',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      cache: config.cache !== false,
      debug: config.debug || false
    };
  }

  /**
   * Buscar lista de runes (etchings)
   */
  async getEtchings(params: EtchingsParams = {}): Promise<EtchingsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());
    if (params.order) queryParams.set('order', params.order);
    if (params.order_by) queryParams.set('order_by', params.order_by);

    const url = `${this.config.baseUrl}/etchings${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await this.request<EtchingsResponse>(url, 'GET_ETCHINGS');
    return response.data;
  }

  /**
   * Buscar holders de um rune específico
   */
  async getHolders(etching: string, params: HoldersParams = {}): Promise<HoldersResponse> {
    if (!etching || typeof etching !== 'string') {
      throw new RunesApiError('Etching name is required and must be a string', 400, 'INVALID_ETCHING');
    }

    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());
    if (params.order) queryParams.set('order', params.order);
    if (params.order_by) queryParams.set('order_by', params.order_by);

    const url = `${this.config.baseUrl}/holders/${encodeURIComponent(etching)}${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await this.request<HoldersResponse>(url, 'GET_HOLDERS');
    return response.data;
  }

  /**
   * Buscar atividade/transações de um rune específico
   */
  async getActivity(etching: string, params: ActivityParams = {}): Promise<ActivityResponse> {
    if (!etching || typeof etching !== 'string') {
      throw new RunesApiError('Etching name is required and must be a string', 400, 'INVALID_ETCHING');
    }

    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());
    if (params.order) queryParams.set('order', params.order);
    if (params.order_by) queryParams.set('order_by', params.order_by);
    if (params.operation) queryParams.set('operation', params.operation);
    if (params.from_block) queryParams.set('from_block', params.from_block.toString());
    if (params.to_block) queryParams.set('to_block', params.to_block.toString());

    const url = `${this.config.baseUrl}/activity/${encodeURIComponent(etching)}${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await this.request<ActivityResponse>(url, 'GET_ACTIVITY');
    return response.data;
  }

  /**
   * Buscar dados de preço
   */
  async getPriceData(params: PriceDataParams = {}): Promise<PriceDataResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.symbols && params.symbols.length > 0) {
      queryParams.set('symbols', params.symbols.join(','));
    }
    if (params.interval) queryParams.set('interval', params.interval);
    if (params.period) queryParams.set('period', params.period);
    if (params.limit) queryParams.set('limit', params.limit.toString());

    const url = `${this.config.baseUrl}/price-data${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await this.request<PriceDataResponse>(url, 'GET_PRICE_DATA');
    return response.data;
  }

  /**
   * Buscar dados de preço para runes específicos
   */
  async getPriceDataForRunes(symbols: string[], params: Omit<PriceDataParams, 'symbols'> = {}): Promise<PriceDataResponse> {
    return this.getPriceData({
      ...params,
      symbols
    });
  }

  /**
   * Buscar dados de um rune específico (combinação de etchings, holders e atividade)
   */
  async getRuneDetails(etching: string): Promise<{
    info: RuneEtching | null;
    holders: RuneHolder[];
    recentActivity: RuneActivity[];
    priceData: RunePriceData | null;
  }> {
    try {
      // Buscar informações básicas do rune
      const etchingsResponse = await this.getEtchings({ limit: 1000 });
      const runeInfo = etchingsResponse.results.find(rune => 
        rune.symbol === etching || rune.name === etching
      );

      // Buscar dados em paralelo
      const [holdersResponse, activityResponse, priceResponse] = await Promise.allSettled([
        this.getHolders(etching, { limit: 10 }),
        this.getActivity(etching, { limit: 10 }),
        this.getPriceData({ symbols: [etching], limit: 1 })
      ]);

      return {
        info: runeInfo || null,
        holders: holdersResponse.status === 'fulfilled' ? holdersResponse.value.results : [],
        recentActivity: activityResponse.status === 'fulfilled' ? activityResponse.value.results : [],
        priceData: priceResponse.status === 'fulfilled' && 
                   priceResponse.value.results.length > 0 && 
                   'data' in priceResponse.value.results[0] ? 
                   priceResponse.value.results[0].data : null
      };
    } catch (error) {
      if (this.config.debug) {
        console.error('Error fetching rune details:', error);
      }
      throw error;
    }
  }

  /**
   * Método privado para fazer requisições com retry e cache
   */
  private async request<T>(url: string, operation: string): Promise<HiroApiResponse<T>> {
    const cacheKey = `${operation}_${url}`;
    
    // Verificar cache se habilitado  
    if (this.config.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) { // 1 minuto de cache
        if (this.config.debug) {
        }
        return cached.data;
      }
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        if (this.config.debug) {
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new RunesApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            'HTTP_ERROR'
          );
        }

        const data: HiroApiResponse<T> = await response.json();

        if (!data.success) {
          throw new RunesApiError(
            data.error || 'API request failed',
            500,
            'API_ERROR',
            data
          );
        }

        // Cachear resposta bem-sucedida
        if (this.config.cache) {
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
        }

        if (this.config.debug) {
        }

        return data;

      } catch (error: any) {
        lastError = error;
        
        if (this.config.debug) {
          console.error(`${operation} failed on attempt ${attempt}:`, error.message);
        }

        // Não retry em erros 4xx (client errors)
        if (error.status && error.status >= 400 && error.status < 500) {
          break;
        }

        // Se não é a última tentativa, aguardar antes de tentar novamente
        if (attempt < this.config.retries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }

    throw lastError || new RunesApiError('Request failed after all retries', 500, 'MAX_RETRIES_EXCEEDED');
  }

  /**
   * Limpar cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Obter estatísticas do cache
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Configurar debug mode
   */
  setDebug(enabled: boolean): void {
    this.config.debug = enabled;
  }
}

// Instância padrão do cliente
export const runesClient = new HiroRunesClient();

// Hook React para usar o cliente (se estiver em ambiente React)
export function useRunesClient(config?: RunesApiConfig) {
  return new HiroRunesClient(config);
}

// Funções de conveniência para uso direto
export const getEtchings = (params?: EtchingsParams) => runesClient.getEtchings(params);
export const getHolders = (etching: string, params?: HoldersParams) => runesClient.getHolders(etching, params);
export const getActivity = (etching: string, params?: ActivityParams) => runesClient.getActivity(etching, params);
export const getPriceData = (params?: PriceDataParams) => runesClient.getPriceData(params);
export const getRuneDetails = (etching: string) => runesClient.getRuneDetails(etching);