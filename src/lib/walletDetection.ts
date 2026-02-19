/**
 * Wallet Detection System
 * Secure detection and identification of Bitcoin wallets
 * 
 * @version 1.0.0
 * @author CYPHER ORDI FUTURE - Agent 5
 */

import { WalletProvider } from './walletSecurity';

// Wallet Detection Result
export interface WalletDetectionResult {
  provider: WalletProvider;
  isInstalled: boolean;
  isEnabled: boolean;
  version?: string;
  capabilities: WalletCapability[];
  securityFeatures: SecurityFeature[];
  lastDetected: Date;
  warningFlags: string[];
}

// Wallet Capabilities
export enum WalletCapability {
  SIGN_MESSAGE = 'signMessage',
  SIGN_TRANSACTION = 'signTransaction',
  SEND_BITCOIN = 'sendBitcoin',
  GET_ACCOUNTS = 'getAccounts',
  GET_PUBLIC_KEY = 'getPublicKey',
  GET_BALANCE = 'getBalance',
  SWITCH_NETWORK = 'switchNetwork',
  REQUEST_PERMISSIONS = 'requestPermissions',
  ORDINALS_SUPPORT = 'ordinalsSupport',
  RUNES_SUPPORT = 'runesSupport',
  BRC20_SUPPORT = 'brc20Support'
}

// Security Features
export enum SecurityFeature {
  HARDWARE_WALLET = 'hardwareWallet',
  BIOMETRIC_AUTH = 'biometricAuth',
  PIN_PROTECTION = 'pinProtection',
  MULTISIG_SUPPORT = 'multisigSupport',
  TRANSACTION_APPROVAL = 'transactionApproval',
  DOMAIN_BINDING = 'domainBinding',
  SESSION_TIMEOUT = 'sessionTimeout',
  ANTI_PHISHING = 'antiPhishing'
}

// Wallet Interface Definition
interface WalletInterface {
  name: string;
  provider: WalletProvider;
  windowProperty: string;
  detectMethod: () => Promise<WalletDetectionResult>;
  capabilities: WalletCapability[];
  securityFeatures: SecurityFeature[];
}

/**
 * Wallet Detector Class
 */
export class WalletDetector {
  private detectionTimeout: number = 5000; // 5 seconds
  private maxRetries: number = 3;
  private detectionCache: Map<WalletProvider, WalletDetectionResult> = new Map();
  private cacheExpiry: number = 30000; // 30 seconds

  // Wallet interface definitions
  private walletInterfaces: WalletInterface[] = [
    {
      name: 'Unisat',
      provider: 'unisat' as WalletProvider,
      windowProperty: 'unisat',
      detectMethod: () => this.detectUnisat(),
      capabilities: [
        WalletCapability.SIGN_MESSAGE,
        WalletCapability.SIGN_TRANSACTION,
        WalletCapability.SEND_BITCOIN,
        WalletCapability.GET_ACCOUNTS,
        WalletCapability.GET_PUBLIC_KEY,
        WalletCapability.GET_BALANCE,
        WalletCapability.SWITCH_NETWORK,
        WalletCapability.ORDINALS_SUPPORT,
        WalletCapability.RUNES_SUPPORT,
        WalletCapability.BRC20_SUPPORT
      ],
      securityFeatures: [
        SecurityFeature.TRANSACTION_APPROVAL,
        SecurityFeature.SESSION_TIMEOUT,
        SecurityFeature.ANTI_PHISHING
      ]
    },
    {
      name: 'Xverse',
      provider: 'xverse' as WalletProvider,
      windowProperty: 'XverseProviders',
      detectMethod: () => this.detectXverse(),
      capabilities: [
        WalletCapability.SIGN_MESSAGE,
        WalletCapability.SIGN_TRANSACTION,
        WalletCapability.SEND_BITCOIN,
        WalletCapability.GET_ACCOUNTS,
        WalletCapability.GET_PUBLIC_KEY,
        WalletCapability.ORDINALS_SUPPORT,
        WalletCapability.RUNES_SUPPORT
      ],
      securityFeatures: [
        SecurityFeature.HARDWARE_WALLET,
        SecurityFeature.TRANSACTION_APPROVAL,
        SecurityFeature.SESSION_TIMEOUT
      ]
    },
    {
      name: 'Magic Eden',
      provider: 'magiceden' as WalletProvider,
      windowProperty: 'magicEden',
      detectMethod: () => this.detectMagicEden(),
      capabilities: [
        WalletCapability.SIGN_MESSAGE,
        WalletCapability.SIGN_TRANSACTION,
        WalletCapability.GET_ACCOUNTS,
        WalletCapability.ORDINALS_SUPPORT
      ],
      securityFeatures: [
        SecurityFeature.TRANSACTION_APPROVAL,
        SecurityFeature.DOMAIN_BINDING
      ]
    },
    {
      name: 'OYL',
      provider: 'oyl' as WalletProvider,
      windowProperty: 'oyl',
      detectMethod: () => this.detectOyl(),
      capabilities: [
        WalletCapability.SIGN_MESSAGE,
        WalletCapability.SIGN_TRANSACTION,
        WalletCapability.SEND_BITCOIN,
        WalletCapability.GET_ACCOUNTS,
        WalletCapability.ORDINALS_SUPPORT
      ],
      securityFeatures: [
        SecurityFeature.TRANSACTION_APPROVAL,
        SecurityFeature.SESSION_TIMEOUT
      ]
    },
    {
      name: 'Leather',
      provider: 'leather' as WalletProvider,
      windowProperty: 'LeatherProvider',
      detectMethod: () => this.detectLeather(),
      capabilities: [
        WalletCapability.SIGN_MESSAGE,
        WalletCapability.SIGN_TRANSACTION,
        WalletCapability.GET_ACCOUNTS,
        WalletCapability.GET_PUBLIC_KEY
      ],
      securityFeatures: [
        SecurityFeature.HARDWARE_WALLET,
        SecurityFeature.TRANSACTION_APPROVAL
      ]
    }
  ];

  /**
   * Detect all available wallets
   */
  async detectWallets(): Promise<WalletProvider[]> {
    const detectedWallets: WalletProvider[] = [];
    
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        return detectedWallets;
      }

      const detectionPromises = this.walletInterfaces.map(async (walletInterface) => {
        try {
          const result = await this.detectWalletWithTimeout(walletInterface);
          if (result.isInstalled && result.isEnabled) {
            detectedWallets.push(result.provider);
            this.cacheDetectionResult(result);
          }
          return result;
        } catch (error) {
          return null;
        }
      });

      await Promise.allSettled(detectionPromises);
      return detectedWallets;

    } catch (error) {
      console.error('Wallet detection failed:', error);
      return detectedWallets;
    }
  }

  /**
   * Detect specific wallet
   */
  async detectWallet(provider: WalletProvider): Promise<WalletDetectionResult | null> {
    try {
      // Check cache first
      const cached = this.getCachedResult(provider);
      if (cached) {
        return cached;
      }

      const walletInterface = this.walletInterfaces.find(w => w.provider === provider);
      if (!walletInterface) {
        return null;
      }

      const result = await this.detectWalletWithTimeout(walletInterface);
      this.cacheDetectionResult(result);
      return result;

    } catch (error) {
      console.error(`Failed to detect ${provider}:`, error);
      return null;
    }
  }

  /**
   * Get detailed wallet information
   */
  async getWalletDetails(provider: WalletProvider): Promise<WalletDetectionResult | null> {
    const result = await this.detectWallet(provider);
    if (!result || !result.isInstalled) {
      return null;
    }

    try {
      // Enhanced detection with additional details
      const walletInterface = this.walletInterfaces.find(w => w.provider === provider);
      if (walletInterface) {
        result.capabilities = await this.detectCapabilities(provider);
        result.securityFeatures = await this.detectSecurityFeatures(provider);
        result.version = await this.detectVersion(provider);
      }

      return result;
    } catch (error) {
      console.error(`Failed to get wallet details for ${provider}:`, error);
      return result;
    }
  }

  /**
   * Detect wallet with timeout
   */
  private async detectWalletWithTimeout(
    walletInterface: WalletInterface
  ): Promise<WalletDetectionResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Detection timeout for ${walletInterface.name}`));
      }, this.detectionTimeout);

      walletInterface.detectMethod()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Detect Unisat wallet
   */
  private async detectUnisat(): Promise<WalletDetectionResult> {
    const result: WalletDetectionResult = {
      provider: 'unisat' as WalletProvider,
      isInstalled: false,
      isEnabled: false,
      capabilities: [],
      securityFeatures: [],
      lastDetected: new Date(),
      warningFlags: []
    };

    try {
      const unisat = (window as any).unisat;
      
      if (!unisat) {
        return result;
      }

      result.isInstalled = true;

      // Check if wallet is enabled/unlocked
      try {
        const accounts = await unisat.getAccounts();
        result.isEnabled = Array.isArray(accounts) && accounts.length > 0;
      } catch (error: any) {
        if (error.message?.includes('locked')) {
          result.warningFlags.push('Wallet is locked');
        }
      }

      // Detect version
      if (unisat.version) {
        result.version = unisat.version;
      }

      // Detect capabilities
      result.capabilities = this.detectUnisatCapabilities(unisat);
      result.securityFeatures = this.detectUnisatSecurityFeatures(unisat);

      return result;
    } catch (error) {
      result.warningFlags.push(`Detection error: ${(error as Error).message}`);
      return result;
    }
  }

  /**
   * Detect Xverse wallet
   */
  private async detectXverse(): Promise<WalletDetectionResult> {
    const result: WalletDetectionResult = {
      provider: 'xverse' as WalletProvider,
      isInstalled: false,
      isEnabled: false,
      capabilities: [],
      securityFeatures: [],
      lastDetected: new Date(),
      warningFlags: []
    };

    try {
      const xverse = (window as any).XverseProviders?.BitcoinProvider;
      
      if (!xverse) {
        return result;
      }

      result.isInstalled = true;

      // Check if wallet is enabled
      try {
        const response = await xverse.request('getAccounts', null);
        result.isEnabled = response?.result?.length > 0;
      } catch (error: any) {
        if (error.message?.includes('locked')) {
          result.warningFlags.push('Wallet is locked');
        }
      }

      // Detect capabilities and security features
      result.capabilities = this.detectXverseCapabilities(xverse);
      result.securityFeatures = this.detectXverseSecurityFeatures(xverse);

      return result;
    } catch (error) {
      result.warningFlags.push(`Detection error: ${(error as Error).message}`);
      return result;
    }
  }

  /**
   * Detect Magic Eden wallet
   */
  private async detectMagicEden(): Promise<WalletDetectionResult> {
    const result: WalletDetectionResult = {
      provider: 'magiceden' as WalletProvider,
      isInstalled: false,
      isEnabled: false,
      capabilities: [],
      securityFeatures: [],
      lastDetected: new Date(),
      warningFlags: []
    };

    try {
      const magicEden = (window as any).magicEden?.bitcoin;
      
      if (!magicEden) {
        return result;
      }

      result.isInstalled = true;

      // Check if wallet is enabled
      try {
        const accounts = await magicEden.getAccounts();
        result.isEnabled = Array.isArray(accounts) && accounts.length > 0;
      } catch (error: any) {
        if (error.message?.includes('locked')) {
          result.warningFlags.push('Wallet is locked');
        }
      }

      // Detect capabilities and security features
      result.capabilities = this.detectMagicEdenCapabilities(magicEden);
      result.securityFeatures = this.detectMagicEdenSecurityFeatures(magicEden);

      return result;
    } catch (error) {
      result.warningFlags.push(`Detection error: ${(error as Error).message}`);
      return result;
    }
  }

  /**
   * Detect OYL wallet
   */
  private async detectOyl(): Promise<WalletDetectionResult> {
    const result: WalletDetectionResult = {
      provider: 'oyl' as WalletProvider,
      isInstalled: false,
      isEnabled: false,
      capabilities: [],
      securityFeatures: [],
      lastDetected: new Date(),
      warningFlags: []
    };

    try {
      const oyl = (window as any).oyl;
      
      if (!oyl) {
        return result;
      }

      result.isInstalled = true;

      // Check if wallet is enabled
      try {
        const accounts = await oyl.getAccounts();
        result.isEnabled = Array.isArray(accounts) && accounts.length > 0;
      } catch (error: any) {
        if (error.message?.includes('locked')) {
          result.warningFlags.push('Wallet is locked');
        }
      }

      // Detect capabilities and security features
      result.capabilities = this.detectOylCapabilities(oyl);
      result.securityFeatures = this.detectOylSecurityFeatures(oyl);

      return result;
    } catch (error) {
      result.warningFlags.push(`Detection error: ${(error as Error).message}`);
      return result;
    }
  }

  /**
   * Detect Leather wallet
   */
  private async detectLeather(): Promise<WalletDetectionResult> {
    const result: WalletDetectionResult = {
      provider: 'leather' as WalletProvider,
      isInstalled: false,
      isEnabled: false,
      capabilities: [],
      securityFeatures: [],
      lastDetected: new Date(),
      warningFlags: []
    };

    try {
      const leather = (window as any).LeatherProvider;
      
      if (!leather) {
        return result;
      }

      result.isInstalled = true;

      // Check if wallet is enabled
      try {
        const accounts = await leather.request('getAccounts', {});
        result.isEnabled = accounts?.result?.length > 0;
      } catch (error: any) {
        if (error.message?.includes('locked')) {
          result.warningFlags.push('Wallet is locked');
        }
      }

      // Detect capabilities and security features
      result.capabilities = this.detectLeatherCapabilities(leather);
      result.securityFeatures = this.detectLeatherSecurityFeatures(leather);

      return result;
    } catch (error) {
      result.warningFlags.push(`Detection error: ${(error as Error).message}`);
      return result;
    }
  }

  // Capability detection methods
  private detectUnisatCapabilities(unisat: any): WalletCapability[] {
    const capabilities: WalletCapability[] = [];
    
    if (typeof unisat.getAccounts === 'function') capabilities.push(WalletCapability.GET_ACCOUNTS);
    if (typeof unisat.getPublicKey === 'function') capabilities.push(WalletCapability.GET_PUBLIC_KEY);
    if (typeof unisat.getBalance === 'function') capabilities.push(WalletCapability.GET_BALANCE);
    if (typeof unisat.signMessage === 'function') capabilities.push(WalletCapability.SIGN_MESSAGE);
    if (typeof unisat.signPsbt === 'function') capabilities.push(WalletCapability.SIGN_TRANSACTION);
    if (typeof unisat.sendBitcoin === 'function') capabilities.push(WalletCapability.SEND_BITCOIN);
    if (typeof unisat.switchNetwork === 'function') capabilities.push(WalletCapability.SWITCH_NETWORK);
    
    // Check for Ordinals/Runes support
    if (unisat.version && parseFloat(unisat.version) >= 1.3) {
      capabilities.push(WalletCapability.ORDINALS_SUPPORT);
      capabilities.push(WalletCapability.BRC20_SUPPORT);
    }
    
    return capabilities;
  }

  private detectXverseCapabilities(xverse: any): WalletCapability[] {
    const capabilities: WalletCapability[] = [];
    
    if (typeof xverse.request === 'function') {
      capabilities.push(WalletCapability.GET_ACCOUNTS);
      capabilities.push(WalletCapability.SIGN_MESSAGE);
      capabilities.push(WalletCapability.SIGN_TRANSACTION);
      capabilities.push(WalletCapability.ORDINALS_SUPPORT);
    }
    
    return capabilities;
  }

  private detectMagicEdenCapabilities(magicEden: any): WalletCapability[] {
    const capabilities: WalletCapability[] = [];
    
    if (typeof magicEden.getAccounts === 'function') capabilities.push(WalletCapability.GET_ACCOUNTS);
    if (typeof magicEden.signMessage === 'function') capabilities.push(WalletCapability.SIGN_MESSAGE);
    if (typeof magicEden.signTransaction === 'function') capabilities.push(WalletCapability.SIGN_TRANSACTION);
    
    // Magic Eden specializes in Ordinals
    capabilities.push(WalletCapability.ORDINALS_SUPPORT);
    
    return capabilities;
  }

  private detectOylCapabilities(oyl: any): WalletCapability[] {
    const capabilities: WalletCapability[] = [];
    
    if (typeof oyl.getAccounts === 'function') capabilities.push(WalletCapability.GET_ACCOUNTS);
    if (typeof oyl.signMessage === 'function') capabilities.push(WalletCapability.SIGN_MESSAGE);
    if (typeof oyl.signPsbt === 'function') capabilities.push(WalletCapability.SIGN_TRANSACTION);
    if (typeof oyl.sendBitcoin === 'function') capabilities.push(WalletCapability.SEND_BITCOIN);
    
    capabilities.push(WalletCapability.ORDINALS_SUPPORT);
    
    return capabilities;
  }

  private detectLeatherCapabilities(leather: any): WalletCapability[] {
    const capabilities: WalletCapability[] = [];
    
    if (typeof leather.request === 'function') {
      capabilities.push(WalletCapability.GET_ACCOUNTS);
      capabilities.push(WalletCapability.GET_PUBLIC_KEY);
      capabilities.push(WalletCapability.SIGN_MESSAGE);
      capabilities.push(WalletCapability.SIGN_TRANSACTION);
    }
    
    return capabilities;
  }

  // Security feature detection methods
  private detectUnisatSecurityFeatures(unisat: any): SecurityFeature[] {
    const features: SecurityFeature[] = [
      SecurityFeature.TRANSACTION_APPROVAL,
      SecurityFeature.SESSION_TIMEOUT,
      SecurityFeature.ANTI_PHISHING
    ];
    
    if (unisat.isHardwareWallet) {
      features.push(SecurityFeature.HARDWARE_WALLET);
    }
    
    return features;
  }

  private detectXverseSecurityFeatures(xverse: any): SecurityFeature[] {
    return [
      SecurityFeature.HARDWARE_WALLET,
      SecurityFeature.TRANSACTION_APPROVAL,
      SecurityFeature.SESSION_TIMEOUT,
      SecurityFeature.BIOMETRIC_AUTH
    ];
  }

  private detectMagicEdenSecurityFeatures(magicEden: any): SecurityFeature[] {
    return [
      SecurityFeature.TRANSACTION_APPROVAL,
      SecurityFeature.DOMAIN_BINDING
    ];
  }

  private detectOylSecurityFeatures(oyl: any): SecurityFeature[] {
    return [
      SecurityFeature.TRANSACTION_APPROVAL,
      SecurityFeature.SESSION_TIMEOUT
    ];
  }

  private detectLeatherSecurityFeatures(leather: any): SecurityFeature[] {
    return [
      SecurityFeature.HARDWARE_WALLET,
      SecurityFeature.TRANSACTION_APPROVAL,
      SecurityFeature.PIN_PROTECTION
    ];
  }

  // Utility methods
  private async detectCapabilities(provider: WalletProvider): Promise<WalletCapability[]> {
    const walletInterface = this.walletInterfaces.find(w => w.provider === provider);
    return walletInterface?.capabilities || [];
  }

  private async detectSecurityFeatures(provider: WalletProvider): Promise<SecurityFeature[]> {
    const walletInterface = this.walletInterfaces.find(w => w.provider === provider);
    return walletInterface?.securityFeatures || [];
  }

  private async detectVersion(provider: WalletProvider): Promise<string | undefined> {
    try {
      const window_obj = window as any;
      
      switch (provider) {
        case 'unisat':
          return window_obj.unisat?.version;
        case 'xverse':
          return window_obj.XverseProviders?.version;
        default:
          return undefined;
      }
    } catch {
      return undefined;
    }
  }

  private cacheDetectionResult(result: WalletDetectionResult): void {
    this.detectionCache.set(result.provider, result);
    
    // Clear cache after expiry
    setTimeout(() => {
      this.detectionCache.delete(result.provider);
    }, this.cacheExpiry);
  }

  private getCachedResult(provider: WalletProvider): WalletDetectionResult | null {
    const cached = this.detectionCache.get(provider);
    if (cached) {
      const age = Date.now() - cached.lastDetected.getTime();
      if (age < this.cacheExpiry) {
        return cached;
      }
      this.detectionCache.delete(provider);
    }
    return null;
  }

  /**
   * Check wallet compatibility
   */
  isWalletCompatible(provider: WalletProvider, requiredCapabilities: WalletCapability[]): boolean {
    const walletInterface = this.walletInterfaces.find(w => w.provider === provider);
    if (!walletInterface) return false;

    return requiredCapabilities.every(cap => 
      walletInterface.capabilities.includes(cap)
    );
  }

  /**
   * Get recommended wallets based on requirements
   */
  getRecommendedWallets(
    requiredCapabilities: WalletCapability[] = [],
    requiredSecurityFeatures: SecurityFeature[] = []
  ): WalletProvider[] {
    return this.walletInterfaces
      .filter(wallet => {
        const hasCapabilities = requiredCapabilities.every(cap => 
          wallet.capabilities.includes(cap)
        );
        const hasSecurityFeatures = requiredSecurityFeatures.every(feature => 
          wallet.securityFeatures.includes(feature)
        );
        return hasCapabilities && hasSecurityFeatures;
      })
      .map(wallet => wallet.provider);
  }

  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.detectionCache.clear();
  }
}

// Export singleton instance
export const walletDetector = new WalletDetector();