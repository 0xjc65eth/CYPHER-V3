// 🛡️ CYPHER ORDI FUTURE - Extension Conflict Resolver
// Resolve conflicts between multiple wallet extensions

interface WindowProviders {
  ethereum?: any;
  solana?: any;
  unisat?: any;
  xverse?: any;
  magicEden?: any;
  BitcoinProvider?: any;
  phantom?: any;
}

declare global {
  interface Window extends WindowProviders {
    cypherWalletProviders?: {
      ethereum: any[];
      bitcoin: any[];
      solana: any[];
    };
    cypherExtensionResolver?: any;
  }
}

class ExtensionConflictResolver {
  private providers: {
    ethereum: any[];
    bitcoin: any[];
    solana: any[];
  } = {
    ethereum: [],
    bitcoin: [],
    solana: []
  };

  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized || typeof window === 'undefined') return;
    
    try {
      // Aguardar um pouco para as extensões carregarem
      setTimeout(() => {
        this.scanProviders();
        this.setupConflictResolution();
        this.monitorChanges();
        this.initialized = true;
      }, 1000);
    } catch (error) {
      console.warn('ExtensionConflictResolver init error:', error);
    }
  }

  private scanProviders() {
    // Scanning wallet providers
    
    // Ethereum/EVM providers
    if (window.ethereum) {
      this.providers.ethereum.push({
        name: 'ethereum',
        provider: window.ethereum,
        isMetaMask: window.ethereum.isMetaMask,
        isBrave: window.ethereum.isBraveWallet,
        isCoinbase: window.ethereum.isCoinbaseWallet
      });
    }

    // Bitcoin providers
    if (window.unisat) {
      this.providers.bitcoin.push({
        name: 'unisat',
        provider: window.unisat
      });
    }

    if (window.xverse) {
      this.providers.bitcoin.push({
        name: 'xverse',
        provider: window.xverse
      });
    }

    if (window.BitcoinProvider) {
      this.providers.bitcoin.push({
        name: 'magiceden',
        provider: window.BitcoinProvider
      });
    }

    // Solana providers
    if (window.solana) {
      this.providers.solana.push({
        name: 'phantom',
        provider: window.solana,
        isPhantom: window.solana.isPhantom
      });
    }

    if (window.phantom?.solana) {
      this.providers.solana.push({
        name: 'phantom-direct',
        provider: window.phantom.solana,
        isPhantom: true
      });
    }

    // Expor providers organizados globalmente
    window.cypherWalletProviders = this.providers;

    // Wallet providers scanned
  }

  private setupConflictResolution() {
    try {
      // Prevent ethereum property conflicts
      this.protectEthereumProvider();
      
      // Prevent solana property conflicts
      this.protectSolanaProvider();
      
      // Suppress common error messages
      this.suppressKnownErrors();
      
    } catch (error) {
      console.warn('Conflict resolution setup error:', error);
    }
  }

  private protectEthereumProvider() {
    if (!window.ethereum) return;

    const originalEthereum = window.ethereum;
    
    // Create a proxy to handle multiple providers
    const ethereumProxy = new Proxy(originalEthereum, {
      get(target, prop) {
        // Handle provider selection logic
        if (prop === 'providers' && target.providers) {
          return target.providers;
        }
        
        // For MetaMask specifically
        if (prop === 'isMetaMask') {
          return target.isMetaMask || false;
        }
        
        return target[prop as string];
      },
      
      set(target, prop, value) {
        // Prevent overwriting critical properties
        if (prop === 'request' || prop === 'enable' || prop === 'send') {
          console.warn(`Prevented overwriting ethereum.${String(prop)}`);
          return true;
        }
        
        target[prop as string] = value;
        return true;
      }
    });

    try {
      // Carefully replace window.ethereum
      Object.defineProperty(window, 'ethereum', {
        value: ethereumProxy,
        writable: false,
        configurable: true
      });
    } catch (error) {
      console.warn('Could not protect ethereum provider:', error);
    }
  }

  private protectSolanaProvider() {
    if (!window.solana) return;

    const originalSolana = window.solana;
    
    const solanaProxy = new Proxy(originalSolana as any, {
      get(target, prop) {
        if (prop === 'isPhantom') {
          return target.isPhantom || false;
        }
        
        return target[prop as string];
      },
      
      set(target, prop, value) {
        // Prevent overwriting critical methods
        if (prop === 'connect' || prop === 'disconnect' || prop === 'signTransaction') {
          console.warn(`Prevented overwriting solana.${String(prop)}`);
          return true;
        }
        
        target[prop as string] = value;
        return true;
      }
    });

    try {
      Object.defineProperty(window, 'solana', {
        value: solanaProxy,
        writable: false,
        configurable: true
      });
    } catch (error) {
      console.warn('Could not protect solana provider:', error);
    }
  }

  private suppressKnownErrors() {
    // Suppress Magic Eden injection errors
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = (...args) => {
      const message = args.join(' ');
      
      // Suppress known wallet conflicts
      if (
        message.includes('Could not assign Magic Eden provider') ||
        message.includes('defineProperty') ||
        message.includes('trap returned falsish') ||
        message.includes('Cannot set property ethereum') ||
        message.includes('which has only a getter')
      ) {
        return; // Suppress this error
      }
      
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.join(' ');
      
      if (
        message.includes('Multiple wallet providers detected') ||
        message.includes('Provider injection conflict')
      ) {
        return; // Suppress this warning
      }
      
      originalConsoleWarn.apply(console, args);
    };
  }

  private monitorChanges() {
    // Monitor for new provider injections
    const observer = new MutationObserver(() => {
      // Re-scan if DOM changes
      setTimeout(() => this.scanProviders(), 500);
    });

    observer.observe(document.head, {
      childList: true,
      subtree: true
    });

    // Monitor window changes
    let lastEthereumProvider = window.ethereum;
    let lastSolanaProvider = window.solana;

    setInterval(() => {
      if (window.ethereum !== lastEthereumProvider) {
        // Ethereum provider changed, re-scanning
        lastEthereumProvider = window.ethereum;
        this.scanProviders();
      }
      
      if (window.solana !== lastSolanaProvider) {
        // Solana provider changed, re-scanning
        lastSolanaProvider = window.solana;
        this.scanProviders();
      }
    }, 2000);
  }

  // Public methods for getting specific providers
  public getEthereumProvider(preferredWallet?: string) {
    if (this.providers.ethereum.length === 0) return null;
    
    if (preferredWallet) {
      const preferred = this.providers.ethereum.find(p => 
        p.name === preferredWallet || 
        (preferredWallet === 'metamask' && p.isMetaMask)
      );
      if (preferred) return preferred.provider;
    }
    
    // Default to first provider
    return this.providers.ethereum[0].provider;
  }

  public getBitcoinProvider(walletType: 'unisat' | 'xverse' | 'magiceden') {
    const provider = this.providers.bitcoin.find(p => p.name === walletType);
    return provider?.provider || null;
  }

  public getSolanaProvider() {
    if (this.providers.solana.length === 0) return null;
    
    // Prefer Phantom
    const phantom = this.providers.solana.find(p => p.isPhantom);
    if (phantom) return phantom.provider;
    
    return this.providers.solana[0].provider;
  }

  public getAvailableWallets() {
    return {
      ethereum: this.providers.ethereum.map(p => ({
        name: p.name,
        isMetaMask: p.isMetaMask,
        isBrave: p.isBrave,
        isCoinbase: p.isCoinbase
      })),
      bitcoin: this.providers.bitcoin.map(p => ({ name: p.name })),
      solana: this.providers.solana.map(p => ({ 
        name: p.name, 
        isPhantom: p.isPhantom 
      }))
    };
  }
}

// TEMPORARILY DISABLED - Causing conflicts with wallet extensions
// export const extensionConflictResolver = new ExtensionConflictResolver();
export const extensionConflictResolver = null as any;

// Helper function to safely access providers
export function getSafeProvider(type: 'ethereum' | 'bitcoin' | 'solana', walletName?: string) {
  try {
    switch (type) {
      case 'ethereum':
        return extensionConflictResolver.getEthereumProvider(walletName);
      case 'bitcoin':
        return extensionConflictResolver.getBitcoinProvider(walletName as any);
      case 'solana':
        return extensionConflictResolver.getSolanaProvider();
      default:
        return null;
    }
  } catch (error) {
    console.warn(`Error getting ${type} provider:`, error);
    return null;
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.cypherExtensionResolver = extensionConflictResolver;
}

export default extensionConflictResolver;