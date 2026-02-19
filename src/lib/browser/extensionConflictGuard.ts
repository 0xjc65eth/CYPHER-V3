// Browser Extension Conflict Guard
// Protects against wallet and security extension conflicts

export class ExtensionConflictGuard {
  private static instance: ExtensionConflictGuard;
  private conflictingExtensions: Set<string> = new Set();
  private originalConsoleError: typeof console.error;

  constructor() {
    this.originalConsoleError = console.error;
    this.setupErrorInterception();
    this.detectConflictingExtensions();
  }

  static getInstance(): ExtensionConflictGuard {
    if (!ExtensionConflictGuard.instance) {
      ExtensionConflictGuard.instance = new ExtensionConflictGuard();
    }
    return ExtensionConflictGuard.instance;
  }

  private setupErrorInterception(): void {
    // Override console.error to filter out extension-related errors
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Filter out known extension conflicts
      const knownConflicts = [
        'defineProperty.*proxy.*trap returned falsish',
        'Cannot redefine property: ethereum',
        'Cannot set property ethereum',
        'Magic Eden provider',
        'Pocket Universe',
        'chrome-extension://',
        'inject.chrome',
        'hostname_check'
      ];

      const isExtensionError = knownConflicts.some(pattern => 
        new RegExp(pattern, 'i').test(message)
      );

      if (!isExtensionError) {
        this.originalConsoleError.apply(console, args);
      } else {
        // Log extension conflicts separately for debugging
      }
    };
  }

  private detectConflictingExtensions(): void {
    if (typeof window === 'undefined') return;

    const extensionChecks = [
      { name: 'Pocket Universe', check: () => document.querySelector('script[src*="inject.chrome"]') },
      { name: 'Magic Eden', check: () => (window as any).magicEden },
      { name: 'MetaMask', check: () => (window as any).ethereum?.isMetaMask },
      { name: 'Phantom', check: () => (window as any).phantom },
      { name: 'LaserEyes', check: () => (window as any).LaserEyes }
    ];

    extensionChecks.forEach(({ name, check }) => {
      try {
        if (check()) {
          this.conflictingExtensions.add(name);
        }
      } catch (error) {
        // Extension check failed, likely due to security restrictions
      }
    });

    if (this.conflictingExtensions.size > 0) {
    }
  }

  // Safely access window properties that might be modified by extensions
  safeWindowAccess<T>(propertyPath: string, defaultValue: T): T {
    try {
      const parts = propertyPath.split('.');
      let current: any = window;
      
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          return defaultValue;
        }
      }
      
      return current ?? defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  // Create safe proxy for wallet interactions
  createSafeProxy<T extends object>(target: T, name: string): T {
    return new Proxy(target, {
      get(obj, prop) {
        try {
          return obj[prop as keyof T];
        } catch (error) {
          return undefined;
        }
      },
      
      set(obj, prop, value) {
        try {
          (obj as any)[prop] = value;
          return true;
        } catch (error) {
          return false;
        }
      },

      defineProperty(obj, prop, descriptor) {
        try {
          Object.defineProperty(obj, prop, descriptor);
          return true;
        } catch (error) {
          return false; // Return false instead of throwing
        }
      }
    });
  }

  getConflictingExtensions(): string[] {
    return Array.from(this.conflictingExtensions);
  }

  hasConflicts(): boolean {
    return this.conflictingExtensions.size > 0;
  }

  // Restore original console.error if needed
  restoreConsole(): void {
    console.error = this.originalConsoleError;
  }
}

// Initialize the guard automatically
if (typeof window !== 'undefined') {
  ExtensionConflictGuard.getInstance();
}

export default ExtensionConflictGuard;