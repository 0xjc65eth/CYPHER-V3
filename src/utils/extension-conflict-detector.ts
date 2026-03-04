/**
 * 🔍 EXTENSION CONFLICT DETECTOR - CYPHER ORDi FUTURE V3
 * Detecta e reporta conflitos entre extensões de wallet
 */

import { EnhancedLogger } from '@/lib/enhanced-logger';
import { ErrorReporter } from '@/lib/ErrorReporter';

interface ExtensionInfo {
  name: string;
  detected: boolean;
  version?: string;
  provider?: any;
  priority: number;
  conflicts: string[];
}

interface ConflictReport {
  totalExtensions: number;
  activeConflicts: number;
  extensions: ExtensionInfo[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
}

export class ExtensionConflictDetector {
  private static instance: ExtensionConflictDetector;
  private detectedExtensions: Map<string, ExtensionInfo> = new Map();
  private conflictPatterns = [
    {
      pattern: /Cannot set property ethereum/,
      source: 'ethereum-provider',
      severity: 'high' as const
    },
    {
      pattern: /Cannot redefine property: BitcoinProvider/,
      source: 'bitcoin-provider',
      severity: 'high' as const
    },
    {
      pattern: /MetaMask encountered an error setting the global Ethereum provider/,
      source: 'metamask-conflict',
      severity: 'medium' as const
    }
  ];

  static getInstance(): ExtensionConflictDetector {
    if (!ExtensionConflictDetector.instance) {
      ExtensionConflictDetector.instance = new ExtensionConflictDetector();
    }
    return ExtensionConflictDetector.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeDetection();
    }
  }

  private initializeDetection(): void {
    try {
      // Detect extensions immediately
      this.detectExtensions();

      // Setup console error monitoring
      this.setupErrorMonitoring();

      // Monitor for provider changes
      this.monitorProviderChanges();

      // Setup periodic checks
      setInterval(() => {
        this.detectExtensions();
      }, 10000); // Check every 10 seconds

      EnhancedLogger.info('Extension conflict detector initialized', {
        component: 'ExtensionConflictDetector',
        detectedExtensions: this.detectedExtensions.size
      });
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'ExtensionConflictDetector',
        action: 'initialize'
      });
    }
  }

  private detectExtensions(): void {
    if (typeof window === 'undefined') return;

    const win = window as any;
    
    // Detect MetaMask
    this.checkExtension('metamask', {
      name: 'MetaMask',
      detected: !!(win.ethereum?.isMetaMask),
      provider: win.ethereum,
      priority: 1
    });

    // Detect Xverse
    this.checkExtension('xverse', {
      name: 'Xverse Wallet',
      detected: !!(win.XverseProviders || win.BitcoinProvider),
      provider: win.XverseProviders || win.BitcoinProvider,
      priority: 3
    });

    // Detect Unisat
    this.checkExtension('unisat', {
      name: 'Unisat Wallet',
      detected: !!(win.unisat),
      provider: win.unisat,
      priority: 3
    });

    // Detect OYL
    this.checkExtension('oyl', {
      name: 'OYL Wallet',
      detected: !!(win.oyl),
      provider: win.oyl,
      priority: 3
    });

    // Detect Coinbase Wallet
    this.checkExtension('coinbase', {
      name: 'Coinbase Wallet',
      detected: !!(win.ethereum?.isCoinbaseWallet),
      provider: win.ethereum,
      priority: 2
    });

    // Detect Trust Wallet
    this.checkExtension('trust', {
      name: 'Trust Wallet',
      detected: !!(win.ethereum?.isTrust),
      provider: win.ethereum,
      priority: 2
    });

    // Check for conflicts
    this.analyzeConflicts();
  }

  private checkExtension(id: string, info: Omit<ExtensionInfo, 'conflicts'>): void {
    const existing = this.detectedExtensions.get(id);
    
    if (info.detected) {
      this.detectedExtensions.set(id, {
        ...info,
        conflicts: existing?.conflicts || []
      });
      
      if (!existing?.detected) {
        EnhancedLogger.info(`Extension detected: ${info.name}`, {
          component: 'ExtensionConflictDetector',
          extension: id,
          priority: info.priority
        });
      }
    } else if (existing?.detected) {
      // Extension was removed
      this.detectedExtensions.delete(id);
      EnhancedLogger.info(`Extension removed: ${info.name}`, {
        component: 'ExtensionConflictDetector',
        extension: id
      });
    }
  }

  private analyzeConflicts(): void {
    const extensions = Array.from(this.detectedExtensions.values());
    
    // Check for ethereum provider conflicts
    const ethereumProviders = extensions.filter(ext => 
      ext.provider && (ext.provider.isMetaMask || ext.provider.isCoinbaseWallet || ext.provider.isTrust)
    );
    
    if (ethereumProviders.length > 1) {
      ethereumProviders.forEach(ext => {
        ext.conflicts.push('Multiple Ethereum providers detected');
      });
    }

    // Check for bitcoin provider conflicts
    const bitcoinProviders = extensions.filter(ext =>
      ext.name.includes('Xverse') || ext.name.includes('Unisat') || ext.name.includes('OYL')
    );

    if (bitcoinProviders.length > 1) {
      bitcoinProviders.forEach(ext => {
        ext.conflicts.push('Multiple Bitcoin providers detected');
      });
    }
  }

  private setupErrorMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Override console.error to catch extension conflicts
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      
      // Check if this is a known conflict pattern
      for (const pattern of this.conflictPatterns) {
        if (pattern.pattern.test(message)) {
          this.reportConflict(pattern.source, message, pattern.severity);
          break;
        }
      }
      
      // Call original console.error
      originalError.apply(console, args);
    };

    // Listen for unhandled errors
    window.addEventListener('error', (event) => {
      this.checkErrorForConflicts(event.error?.message || event.message);
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.checkErrorForConflicts(event.reason?.message || String(event.reason));
    });
  }

  private checkErrorForConflicts(message: string): void {
    if (!message) return;

    for (const pattern of this.conflictPatterns) {
      if (pattern.pattern.test(message)) {
        this.reportConflict(pattern.source, message, pattern.severity);
      }
    }
  }

  private reportConflict(source: string, message: string, severity: 'low' | 'medium' | 'high'): void {
    EnhancedLogger.warn(`Extension conflict detected: ${source}`, {
      component: 'ExtensionConflictDetector',
      source,
      message,
      severity
    });

    // Add conflict to relevant extensions
    this.detectedExtensions.forEach(ext => {
      if (message.toLowerCase().includes(ext.name.toLowerCase())) {
        ext.conflicts.push(`${source}: ${message}`);
      }
    });
  }

  private monitorProviderChanges(): void {
    if (typeof window === 'undefined') return;

    const win = window as any;
    let lastEthereumProvider = win.ethereum;
    let lastBitcoinProvider = win.bitcoin;

    setInterval(() => {
      // Check for ethereum provider changes
      if (win.ethereum !== lastEthereumProvider) {
        EnhancedLogger.info('Ethereum provider changed', {
          component: 'ExtensionConflictDetector',
          oldProvider: this.getProviderInfo(lastEthereumProvider),
          newProvider: this.getProviderInfo(win.ethereum)
        });
        lastEthereumProvider = win.ethereum;
        this.detectExtensions();
      }

      // Check for bitcoin provider changes
      if (win.bitcoin !== lastBitcoinProvider) {
        EnhancedLogger.info('Bitcoin provider changed', {
          component: 'ExtensionConflictDetector',
          oldProvider: this.getProviderInfo(lastBitcoinProvider),
          newProvider: this.getProviderInfo(win.bitcoin)
        });
        lastBitcoinProvider = win.bitcoin;
        this.detectExtensions();
      }
    }, 2000);
  }

  private getProviderInfo(provider: any): any {
    if (!provider) return null;
    
    return {
      isMetaMask: provider.isMetaMask,
      isCoinbaseWallet: provider.isCoinbaseWallet,
      isTrust: provider.isTrust,
      isXverse: provider.isXverse,
      constructor: provider.constructor?.name
    };
  }

  // Public API
  getConflictReport(): ConflictReport {
    const extensions = Array.from(this.detectedExtensions.values());
    const totalConflicts = extensions.reduce((sum, ext) => sum + ext.conflicts.length, 0);
    
    let severity: 'low' | 'medium' | 'high' = 'low';
    if (totalConflicts > 5) severity = 'high';
    else if (totalConflicts > 2) severity = 'medium';

    const recommendations = this.generateRecommendations(extensions);

    return {
      totalExtensions: extensions.length,
      activeConflicts: totalConflicts,
      extensions,
      recommendations,
      severity
    };
  }

  private generateRecommendations(extensions: ExtensionInfo[]): string[] {
    const recommendations: string[] = [];
    
    const ethereumProviders = extensions.filter(ext => 
      ext.detected && ext.provider && (ext.provider.isMetaMask || ext.provider.isCoinbaseWallet)
    );
    
    const bitcoinProviders = extensions.filter(ext =>
      ext.detected && (ext.name.includes('Xverse') || ext.name.includes('Unisat'))
    );

    if (ethereumProviders.length > 1) {
      recommendations.push('Consider disabling all but one Ethereum wallet extension');
    }

    if (bitcoinProviders.length > 1) {
      recommendations.push('Consider disabling all but one Bitcoin wallet extension');
    }

    if (extensions.some(ext => ext.conflicts.length > 0)) {
      recommendations.push('Restart your browser after disabling conflicting extensions');
      recommendations.push('Clear browser cache and cookies for this site');
    }

    return recommendations;
  }

  getExtensionByName(name: string): ExtensionInfo | null {
    for (const [, ext] of this.detectedExtensions) {
      if (ext.name.toLowerCase().includes(name.toLowerCase())) {
        return ext;
      }
    }
    return null;
  }

  hasConflicts(): boolean {
    return Array.from(this.detectedExtensions.values()).some(ext => ext.conflicts.length > 0);
  }

  getActiveExtensions(): ExtensionInfo[] {
    return Array.from(this.detectedExtensions.values()).filter(ext => ext.detected);
  }
}

// Export singleton instance
export const extensionConflictDetector = typeof window !== 'undefined' 
  ? ExtensionConflictDetector.getInstance() 
  : null;

export default ExtensionConflictDetector;