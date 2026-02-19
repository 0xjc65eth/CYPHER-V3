/**
 * Bitcoin Wallet Connect Service
 * 
 * Integração profissional com carteiras Bitcoin incluindo:
 * - XVERSE, UNISAT, OYL WALLET, MAGIC EDEN
 * - APIs do Hiro para dados em tempo real
 * - Suporte completo para Ordinals e Runes
 * - Tratamento robusto de erros
 * - Validação automática de carteiras
 * 
 * @author CypherAI v3.0
 * @version 3.0.0
 */

export interface WalletOptions {
  network?: 'mainnet' | 'testnet';
  autoDetect?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  apiTimeout?: number;
  enableLogging?: boolean;
}

export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  currentWallet: string | null;
  currentAddress: string | null;
  balance: any | null;
  network: string;
  lastUpdate: number | null;
  error: string | null;
}

export interface WalletInfo {
  name: string;
  icon: string;
  provider: () => any;
  detectMethod: () => boolean;
}

export interface ConnectionResult {
  address: string;
  balance?: any;
  walletType: string;
  accounts: any[];
  publicKey?: string | null;
  addressType?: string;
  ordinalsAddress?: string;
  paymentAddress?: string;
}

export interface BalanceData {
  confirmed: number;
  unconfirmed: number;
  total: number;
  btc: {
    confirmed: number;
    unconfirmed: number;
    total: number;
  };
  lastUpdated: number;
}

export interface OrdinalsData {
  total: number;
  inscriptions: any[];
  hasMore: boolean;
  nextOffset: number;
  lastUpdated: number;
}

export interface RunesData {
  total: number;
  holdings: any[];
  totalValue: number;
  lastUpdated: number;
}

class BitcoinWalletConnect {
  private options: Required<WalletOptions>;
  private state: WalletState;
  private cache: Map<string, { value: any; timestamp: number }>;
  private cacheTimeout: number;
  private hiroBaseUrl: string;
  private eventListeners: Map<string, Set<Function>>;
  private supportedWallets: Record<string, WalletInfo>;

  constructor(options: WalletOptions = {}) {
    this.options = {
      network: 'mainnet',
      autoDetect: true,
      retryAttempts: 3,
      retryDelay: 1000,
      apiTimeout: 30000,
      enableLogging: process.env.NODE_ENV === 'development',
      ...options
    };

    // Estado da conexão
    this.state = {
      isConnected: false,
      isConnecting: false,
      currentWallet: null,
      currentAddress: null,
      balance: null,
      network: this.options.network,
      lastUpdate: null,
      error: null
    };

    // Cache para otimização
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 segundos

    // APIs do Hiro
    this.hiroBaseUrl = this.options.network === 'mainnet' 
      ? 'https://api.hiro.so' 
      : 'https://api.testnet.hiro.so';

    // Event listeners
    this.eventListeners = new Map();

    // Carteiras suportadas
    this.supportedWallets = {
      unisat: {
        name: 'UniSat',
        icon: '/wallets/unisat.svg',
        provider: () => (window as any).unisat,
        detectMethod: () => typeof (window as any).unisat !== 'undefined'
      },
      xverse: {
        name: 'Xverse',
        icon: '/wallets/xverse.svg',
        provider: () => (window as any).XverseProviders?.BitcoinProvider,
        detectMethod: () => typeof (window as any).XverseProviders?.BitcoinProvider !== 'undefined'
      },
      oyl: {
        name: 'OYL Wallet',
        icon: '/wallets/oyl.svg',
        provider: () => (window as any).oyl,
        detectMethod: () => typeof (window as any).oyl !== 'undefined'
      },
      magiceden: {
        name: 'Magic Eden',
        icon: '/wallets/magiceden.svg',
        provider: () => (window as any).magicEden?.bitcoin,
        detectMethod: () => typeof (window as any).magicEden?.bitcoin !== 'undefined'
      }
    };

    // Auto-detectar carteiras se habilitado
    if (this.options.autoDetect) {
      this.detectWallets();
    }

    this.log('BitcoinWalletConnect initialized', this.options);
  }

  /**
   * Detecta carteiras Bitcoin disponíveis
   */
  detectWallets(): Record<string, any> {
    const detected: Record<string, any> = {};
    
    for (const [walletId, wallet] of Object.entries(this.supportedWallets)) {
      try {
        const isAvailable = wallet.detectMethod();
        detected[walletId] = {
          available: isAvailable,
          name: wallet.name,
          icon: wallet.icon,
          provider: isAvailable ? wallet.provider() : null
        };

        if (isAvailable) {
          this.log(`Wallet detected: ${wallet.name}`);
        }
      } catch (error: any) {
        this.logError(`Error detecting wallet ${wallet.name}:`, error);
        detected[walletId] = {
          available: false,
          name: wallet.name,
          icon: wallet.icon,
          error: error.message
        };
      }
    }

    this.emit('walletsDetected', detected);
    return detected;
  }

  /**
   * Conecta com uma carteira específica
   */
  async connect(walletType: string): Promise<ConnectionResult> {
    this.log(`Attempting to connect to ${walletType}`);
    
    if (this.state.isConnecting) {
      throw new Error('Already connecting to a wallet');
    }

    if (!this.supportedWallets[walletType]) {
      throw new Error(`Unsupported wallet type: ${walletType}`);
    }

    this.setState({ isConnecting: true, error: null });

    try {
      const wallet = this.supportedWallets[walletType];
      
      if (!wallet.detectMethod()) {
        throw new Error(`${wallet.name} is not installed or not available`);
      }

      const provider = wallet.provider();
      let connectionResult: ConnectionResult;

      // Conectar baseado no tipo de carteira
      switch (walletType) {
        case 'unisat':
          connectionResult = await this.connectUniSat(provider);
          break;
        case 'xverse':
          connectionResult = await this.connectXverse(provider);
          break;
        case 'oyl':
          connectionResult = await this.connectOYL(provider);
          break;
        case 'magiceden':
          connectionResult = await this.connectMagicEden(provider);
          break;
        default:
          throw new Error(`Connection method not implemented for ${walletType}`);
      }

      // Atualizar estado
      this.setState({
        isConnected: true,
        isConnecting: false,
        currentWallet: walletType,
        currentAddress: connectionResult.address,
        lastUpdate: Date.now()
      });

      // Setup event listeners para a carteira
      await this.setupWalletEventListeners(provider, walletType);

      // Carregar dados iniciais
      await this.loadInitialData();

      this.log(`Successfully connected to ${wallet.name}`, connectionResult);
      this.emit('connected', connectionResult);

      return connectionResult;

    } catch (error: any) {
      this.setState({ 
        isConnecting: false, 
        error: error.message 
      });
      this.logError('Connection failed:', error);
      this.emit('connectionError', error);
      throw error;
    }
  }

  /**
   * Conecta com UniSat
   */
  private async connectUniSat(provider: any): Promise<ConnectionResult> {
    try {
      const accounts = await provider.requestAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in UniSat');
      }

      const address = accounts[0];
      const balance = await provider.getBalance();
      
      return {
        address,
        balance,
        walletType: 'unisat',
        accounts,
        publicKey: null // UniSat não expõe publicKey diretamente
      };
    } catch (error: any) {
      throw new Error(`UniSat connection failed: ${error.message}`);
    }
  }

  /**
   * Conecta com Xverse
   */
  private async connectXverse(provider: any): Promise<ConnectionResult> {
    try {
      const result = await provider.request('getAddresses');
      if (!result.addresses || result.addresses.length === 0) {
        throw new Error('No addresses found in Xverse');
      }

      const primaryAddress = result.addresses.find((addr: any) => 
        addr.purpose === 'payment'
      ) || result.addresses[0];

      return {
        address: primaryAddress.address,
        publicKey: primaryAddress.publicKey,
        walletType: 'xverse',
        accounts: result.addresses,
        addressType: primaryAddress.addressType
      };
    } catch (error: any) {
      throw new Error(`Xverse connection failed: ${error.message}`);
    }
  }

  /**
   * Conecta com OYL Wallet
   */
  private async connectOYL(provider: any): Promise<ConnectionResult> {
    try {
      const result = await provider.connect();
      
      return {
        address: result.address,
        publicKey: result.publicKey,
        walletType: 'oyl',
        accounts: [result]
      };
    } catch (error: any) {
      throw new Error(`OYL connection failed: ${error.message}`);
    }
  }

  /**
   * Conecta com Magic Eden
   */
  private async connectMagicEden(provider: any): Promise<ConnectionResult> {
    try {
      const result = await provider.connectWallet();
      
      return {
        address: result.ordinals.address,
        publicKey: result.ordinals.publicKey,
        walletType: 'magiceden',
        accounts: [result.ordinals, result.payment],
        ordinalsAddress: result.ordinals.address,
        paymentAddress: result.payment.address
      };
    } catch (error: any) {
      throw new Error(`Magic Eden connection failed: ${error.message}`);
    }
  }

  /**
   * Configura event listeners para a carteira conectada
   */
  private async setupWalletEventListeners(provider: any, walletType: string): Promise<void> {
    try {
      // Eventos comuns para mudanças de conta
      if (provider.on) {
        provider.on('accountsChanged', (accounts: any[]) => {
          this.log('Accounts changed:', accounts);
          this.handleAccountsChanged(accounts);
        });

        provider.on('disconnect', () => {
          this.log('Wallet disconnected');
          this.disconnect();
        });
      }

      // Eventos específicos por carteira
      switch (walletType) {
        case 'unisat':
          if (provider.on) {
            provider.on('networkChanged', (network: string) => {
              this.log('Network changed:', network);
              this.handleNetworkChanged(network);
            });
          }
          break;
      }
    } catch (error) {
      this.logError('Error setting up wallet event listeners:', error);
    }
  }

  /**
   * Carrega dados iniciais após conexão
   */
  private async loadInitialData(): Promise<void> {
    try {
      if (!this.state.currentAddress) return;

      // Carregar balance em paralelo com outros dados
      const promises = [
        this.getBalance(),
        this.getOrdinals(),
        this.getRunes()
      ];

      const [balance, ordinals, runes] = await Promise.allSettled(promises);

      if (balance.status === 'fulfilled') {
        this.setState({ balance: balance.value });
      }

      this.emit('initialDataLoaded', {
        balance: balance.status === 'fulfilled' ? balance.value : null,
        ordinals: ordinals.status === 'fulfilled' ? ordinals.value : null,
        runes: runes.status === 'fulfilled' ? runes.value : null
      });

    } catch (error) {
      this.logError('Error loading initial data:', error);
    }
  }

  /**
   * Obtém saldo da carteira usando API do Hiro
   */
  async getBalance(address: string | null = null): Promise<BalanceData> {
    const targetAddress = address || this.state.currentAddress;
    if (!targetAddress) {
      throw new Error('No address provided or connected');
    }

    const cacheKey = `balance_${targetAddress}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      this.log(`Fetching balance for address: ${targetAddress}`);
      
      const response = await this.apiRequest(
        `${this.hiroBaseUrl}/extended/v1/address/${targetAddress}/balances`
      );

      const balance: BalanceData = {
        confirmed: parseInt(response.stx?.balance) || 0,
        unconfirmed: parseInt(response.stx?.locked) || 0,
        total: (parseInt(response.stx?.balance) || 0) + (parseInt(response.stx?.locked) || 0),
        btc: {
          confirmed: response.btc?.balance || 0,
          unconfirmed: (response.btc?.total_received || 0) - (response.btc?.balance || 0),
          total: response.btc?.total_received || 0
        },
        lastUpdated: Date.now()
      };

      this.setCache(cacheKey, balance);
      this.emit('balanceUpdated', balance);
      
      return balance;
    } catch (error: any) {
      this.logError('Error fetching balance:', error);
      throw new Error(`Failed to fetch balance: ${error.message}`);
    }
  }

  /**
   * Obtém Ordinals da carteira usando API do Hiro
   */
  async getOrdinals(address: string | null = null, limit: number = 50, offset: number = 0): Promise<OrdinalsData> {
    const targetAddress = address || this.state.currentAddress;
    if (!targetAddress) {
      throw new Error('No address provided or connected');
    }

    const cacheKey = `ordinals_${targetAddress}_${limit}_${offset}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      this.log(`Fetching ordinals for address: ${targetAddress}`);
      
      const response = await this.apiRequest(
        `${this.hiroBaseUrl}/ordinals/v1/inscriptions?address=${targetAddress}&limit=${limit}&offset=${offset}`
      );

      const ordinals: OrdinalsData = {
        total: response.total || 0,
        inscriptions: response.results || [],
        hasMore: (offset + limit) < (response.total || 0),
        nextOffset: offset + limit,
        lastUpdated: Date.now()
      };

      // Enriquecer dados dos Ordinals
      if (ordinals.inscriptions.length > 0) {
        ordinals.inscriptions = await this.enrichOrdinalsData(ordinals.inscriptions);
      }

      this.setCache(cacheKey, ordinals);
      this.emit('ordinalsUpdated', ordinals);
      
      return ordinals;
    } catch (error: any) {
      this.logError('Error fetching ordinals:', error);
      throw new Error(`Failed to fetch ordinals: ${error.message}`);
    }
  }

  /**
   * Obtém Runes da carteira usando API do Hiro
   */
  async getRunes(address: string | null = null, limit: number = 50, offset: number = 0): Promise<RunesData> {
    const targetAddress = address || this.state.currentAddress;
    if (!targetAddress) {
      throw new Error('No address provided or connected');
    }

    const cacheKey = `runes_${targetAddress}_${limit}_${offset}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      this.log(`Fetching runes for address: ${targetAddress}`);
      
      const response = await this.apiRequest(
        `${this.hiroBaseUrl}/runes/v1/holders/${targetAddress}`
      );

      const runes: RunesData = {
        total: response.total || 0,
        holdings: response.results || [],
        totalValue: 0,
        lastUpdated: Date.now()
      };

      // Calcular valor total e enriquecer dados
      if (runes.holdings.length > 0) {
        runes.holdings = await this.enrichRunesData(runes.holdings);
        runes.totalValue = runes.holdings.reduce((total, rune) => 
          total + (rune.estimatedValue || 0), 0
        );
      }

      this.setCache(cacheKey, runes);
      this.emit('runesUpdated', runes);
      
      return runes;
    } catch (error: any) {
      this.logError('Error fetching runes:', error);
      throw new Error(`Failed to fetch runes: ${error.message}`);
    }
  }

  /**
   * Enriquece dados dos Ordinals com informações adicionais
   */
  private async enrichOrdinalsData(inscriptions: any[]): Promise<any[]> {
    return Promise.all(inscriptions.map(async (inscription) => {
      try {
        // Buscar metadados adicionais se disponível
        if (inscription.id) {
          const detailResponse = await this.apiRequest(
            `${this.hiroBaseUrl}/ordinals/v1/inscriptions/${inscription.id}`,
            { timeout: 5000 } // Timeout menor para metadados
          );
          
          return {
            ...inscription,
            metadata: detailResponse,
            contentType: detailResponse.content_type,
            contentLength: detailResponse.content_length,
            timestamp: detailResponse.timestamp,
            satpoint: detailResponse.satpoint
          };
        }
        return inscription;
      } catch (error) {
        // Se falhar ao buscar metadados, retornar dados básicos
        this.logError(`Error enriching ordinal ${inscription.id}:`, error);
        return inscription;
      }
    }));
  }

  /**
   * Enriquece dados dos Runes com informações de preço
   */
  private async enrichRunesData(holdings: any[]): Promise<any[]> {
    return Promise.all(holdings.map(async (holding) => {
      try {
        // Buscar informações de preço e mercado
        const runeInfo = await this.apiRequest(
          `${this.hiroBaseUrl}/runes/v1/runes/${holding.rune}`,
          { timeout: 5000 }
        );
        
        return {
          ...holding,
          runeInfo,
          symbol: runeInfo.symbol,
          divisibility: runeInfo.divisibility,
          estimatedValue: this.calculateRuneValue(holding, runeInfo),
          marketData: runeInfo.marketData || null
        };
      } catch (error) {
        this.logError(`Error enriching rune ${holding.rune}:`, error);
        return {
          ...holding,
          estimatedValue: 0
        };
      }
    }));
  }

  /**
   * Calcula valor estimado de um Rune
   */
  private calculateRuneValue(holding: any, runeInfo: any): number {
    try {
      const amount = parseFloat(holding.amount) || 0;
      const price = parseFloat(runeInfo.marketData?.price) || 0;
      const divisibility = parseInt(runeInfo.divisibility) || 0;
      
      const adjustedAmount = amount / Math.pow(10, divisibility);
      return adjustedAmount * price;
    } catch (error) {
      this.logError('Error calculating rune value:', error);
      return 0;
    }
  }

  /**
   * Desconecta da carteira
   */
  async disconnect(): Promise<void> {
    this.log('Disconnecting wallet');
    
    try {
      // Limpar event listeners se suportado
      const provider = this.getCurrentProvider();
      if (provider && provider.removeAllListeners) {
        provider.removeAllListeners();
      }

      // Reset do estado
      this.setState({
        isConnected: false,
        isConnecting: false,
        currentWallet: null,
        currentAddress: null,
        balance: null,
        error: null,
        lastUpdate: null
      });

      // Limpar cache
      this.cache.clear();

      this.emit('disconnected');
      this.log('Wallet disconnected successfully');
      
    } catch (error) {
      this.logError('Error during disconnect:', error);
    }
  }

  /**
   * Obtém o provider da carteira atual
   */
  getCurrentProvider(): any | null {
    if (!this.state.currentWallet) return null;
    
    const wallet = this.supportedWallets[this.state.currentWallet];
    return wallet ? wallet.provider() : null;
  }

  /**
   * Manipula mudanças de conta
   */
  private async handleAccountsChanged(accounts: any[]): Promise<void> {
    try {
      if (!accounts || accounts.length === 0) {
        await this.disconnect();
        return;
      }

      const newAddress = accounts[0];
      if (newAddress !== this.state.currentAddress) {
        this.setState({ currentAddress: newAddress });
        this.cache.clear(); // Limpar cache pois mudou a conta
        await this.loadInitialData();
        this.emit('accountChanged', newAddress);
      }
    } catch (error) {
      this.logError('Error handling account change:', error);
    }
  }

  /**
   * Manipula mudanças de rede
   */
  private handleNetworkChanged(network: string): void {
    this.log('Network changed to:', network);
    this.setState({ network });
    this.cache.clear(); // Limpar cache pois mudou a rede
    this.emit('networkChanged', network);
  }

  /**
   * Realiza requisição HTTP com retry e timeout
   */
  private async apiRequest(url: string, options: any = {}): Promise<any> {
    const {
      timeout = this.options.apiTimeout,
      retries = this.options.retryAttempts,
      retryDelay = this.options.retryDelay,
      ...fetchOptions
    } = options;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();

      } catch (error: any) {
        if (attempt === retries) {
          throw error;
        }

        this.logError(`API request attempt ${attempt + 1} failed:`, error);
        await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
      }
    }
  }

  /**
   * Gerenciamento de cache
   */
  private setCache(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Utilitários
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private setState(newState: Partial<WalletState>): void {
    this.state = { ...this.state, ...newState };
    this.emit('stateChanged', this.state);
  }

  private log(...args: any[]): void {
    if (this.options.enableLogging) {
    }
  }

  private logError(...args: any[]): void {
    console.error('[BitcoinWalletConnect]', ...args);
  }

  /**
   * Sistema de eventos
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.logError(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Métodos públicos para status
   */
  isConnected(): boolean {
    return this.state.isConnected;
  }

  getCurrentAddress(): string | null {
    return this.state.currentAddress;
  }

  getCurrentWallet(): string | null {
    return this.state.currentWallet;
  }

  getState(): WalletState {
    return { ...this.state };
  }

  /**
   * Refresh manual de dados
   */
  async refreshData(): Promise<void> {
    if (!this.state.isConnected) {
      throw new Error('No wallet connected');
    }

    this.cache.clear();
    await this.loadInitialData();
  }

  /**
   * Validação de endereço Bitcoin
   */
  validateBitcoinAddress(address: string): boolean {
    try {
      // Validação básica de formato de endereço Bitcoin
      const legacyPattern = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
      const segwitPattern = /^bc1[a-z0-9]{39,59}$/;
      const testnetPattern = /^[2mn][a-km-zA-HJ-NP-Z1-9]{25,34}$|^tb1[a-z0-9]{39,59}$/;
      
      if (this.options.network === 'mainnet') {
        return legacyPattern.test(address) || segwitPattern.test(address);
      } else {
        return testnetPattern.test(address);
      }
    } catch (error) {
      this.logError('Error validating address:', error);
      return false;
    }
  }

  /**
   * Destruidor para limpeza
   */
  destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
    this.cache.clear();
  }
}

export default BitcoinWalletConnect;

// Also export the class as a named export for compatibility
export { BitcoinWalletConnect };

// Function to get a singleton instance
let bitcoinWalletInstance: BitcoinWalletConnect | null = null;

export function getBitcoinWallet(options?: WalletOptions): BitcoinWalletConnect {
  if (!bitcoinWalletInstance) {
    bitcoinWalletInstance = new BitcoinWalletConnect(options);
  }
  return bitcoinWalletInstance;
}