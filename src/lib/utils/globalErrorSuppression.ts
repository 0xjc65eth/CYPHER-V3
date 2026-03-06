// 🔇 CYPHER ORDI FUTURE - Global Error Suppression
// Suppress known wallet extension conflicts and errors

class GlobalErrorSuppressor {
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;
  private suppressedErrors: Set<string> = new Set();
  private suppressedWarnings: Set<string> = new Set();

  constructor() {
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Define patterns to suppress
    this.addSuppressedErrors([
      'Cannot set property ethereum',
      'which has only a getter',
      'Could not assign Gamma.io provider',
      'defineProperty.*trap returned falsish',
      'TypeError.*defineProperty.*proxy',
      'Uncaught TypeError.*defineProperty',
      'signTransaction.*proxy',
      'BitcoinProvider.*window',
      'ethereum.*window',
      'inpage.js.*TypeError',
      'inject.chrome.*TypeError',
      'content.js.*TypeError',
      'hostname_check.*TypeError',
      'Cannot read properties of null.*length',
      'Error sending to background hostname check'
    ]);

    this.addSuppressedWarnings([
      'Multiple wallet providers detected',
      'Provider injection conflict',
      'Wallet extension conflict',
      'ERESOLVE overriding peer dependency',
      'npm warn.*peer dependency'
    ]);

    this.setupErrorSuppression();
    this.setupUnhandledErrorSuppression();
  }

  private addSuppressedErrors(patterns: string[]) {
    patterns.forEach(pattern => this.suppressedErrors.add(pattern));
  }

  private addSuppressedWarnings(patterns: string[]) {
    patterns.forEach(pattern => this.suppressedWarnings.add(pattern));
  }

  private setupErrorSuppression() {
    // Override console.error
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Check if this error should be suppressed
      for (const pattern of this.suppressedErrors) {
        if (new RegExp(pattern, 'i').test(message)) {
          // Log to a separate debug console if needed
          if (process.env.NODE_ENV === 'development') {
            console.debug('🔇 Suppressed error:', message);
          }
          return;
        }
      }
      
      // Allow other errors through
      this.originalConsoleError.apply(console, args);
    };

    // Override console.warn
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      
      // Check if this warning should be suppressed
      for (const pattern of this.suppressedWarnings) {
        if (new RegExp(pattern, 'i').test(message)) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('🔇 Suppressed warning:', message);
          }
          return;
        }
      }
      
      // Allow other warnings through
      this.originalConsoleWarn.apply(console, args);
    };
  }

  private setupUnhandledErrorSuppression() {
    // Suppress unhandled promise rejections for known wallet conflicts
    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message || event.reason?.toString() || '';
      
      for (const pattern of this.suppressedErrors) {
        if (new RegExp(pattern, 'i').test(message)) {
          event.preventDefault();
          if (process.env.NODE_ENV === 'development') {
            console.debug('🔇 Suppressed unhandled rejection:', message);
          }
          return;
        }
      }
    });

    // Suppress global errors for known wallet conflicts
    window.addEventListener('error', (event) => {
      const message = event.message || event.error?.message || '';
      
      for (const pattern of this.suppressedErrors) {
        if (new RegExp(pattern, 'i').test(message)) {
          event.preventDefault();
          if (process.env.NODE_ENV === 'development') {
            console.debug('🔇 Suppressed global error:', message);
          }
          return;
        }
      }
    });
  }

  // Method to temporarily disable suppression for debugging
  public disableSuppression() {
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;
  }

  // Method to re-enable suppression
  public enableSuppression() {
    this.setupErrorSuppression();
  }

  // Method to add new patterns at runtime
  public addErrorPattern(pattern: string) {
    this.suppressedErrors.add(pattern);
  }

  public addWarningPattern(pattern: string) {
    this.suppressedWarnings.add(pattern);
  }

  // Get suppression stats
  public getStats() {
    return {
      suppressedErrorPatterns: Array.from(this.suppressedErrors),
      suppressedWarningPatterns: Array.from(this.suppressedWarnings)
    };
  }
}

// Create singleton instance
const globalErrorSuppressor = new GlobalErrorSuppressor();

// Export for debugging access
if (typeof window !== 'undefined') {
  (window as any).cypherErrorSuppressor = globalErrorSuppressor;
}

export default globalErrorSuppressor;