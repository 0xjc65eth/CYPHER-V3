/**
 * Error Suppression for Wallet Extension Conflicts
 * Suppresses known harmless errors from wallet extensions
 */

// Store original console methods
const originalError = console.error;
const originalWarn = console.warn;

// Known harmless error patterns to suppress
const SUPPRESSED_ERROR_PATTERNS = [
  'Cannot redefine property: ethereum',
  'Cannot set property ethereum',
  'Gamma.io provider',
  'Pocket Universe',
  'Failed to define property',
  'Could not assign Gamma.io provider',
  'hostname check',
  'reading \'length\'',
  'extension conflicts',
  'provider conflicts',
  'BitcoinProvider',
  'phantom.ethereum',
  'phantom.solana'
];

const SUPPRESSED_WARN_PATTERNS = [
  'Multiple wallet',
  'Extension conflict',
  'Provider conflict',
  'Wallet extension',
  'Gamma.io',
  'Pocket Universe'
];

/**
 * Check if error message should be suppressed
 */
function shouldSuppressError(message: string): boolean {
  return SUPPRESSED_ERROR_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Check if warning message should be suppressed
 */
function shouldSuppressWarn(message: string): boolean {
  return SUPPRESSED_WARN_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Enhanced console.error that suppresses wallet extension conflicts
 */
function enhancedError(...args: any[]) {
  const message = args.join(' ');
  
  if (shouldSuppressError(message)) {
    // Optionally log to a debug console or completely ignore
    if (process.env.NODE_ENV === 'development') {
      console.debug('[SUPPRESSED ERROR]:', message);
    }
    return;
  }
  
  // Call original error for legitimate errors
  originalError.apply(console, args);
}

/**
 * Enhanced console.warn that suppresses wallet extension conflicts
 */
function enhancedWarn(...args: any[]) {
  const message = args.join(' ');
  
  if (shouldSuppressWarn(message)) {
    // Optionally log to a debug console or completely ignore
    if (process.env.NODE_ENV === 'development') {
      console.debug('[SUPPRESSED WARN]:', message);
    }
    return;
  }
  
  // Call original warn for legitimate warnings
  originalWarn.apply(console, args);
}

/**
 * Initialize error suppression
 */
export function initializeErrorSuppression() {
  if (typeof window === 'undefined') {
    return; // Server-side, don't modify console
  }

  try {
    // Override console methods
    console.error = enhancedError;
    console.warn = enhancedWarn;
    
    // Also suppress window errors related to wallet extensions
    window.addEventListener('error', (event) => {
      const message = event.message || event.error?.message || '';
      
      if (shouldSuppressError(message)) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    });
    
    // Suppress unhandled promise rejections from wallet extensions
    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message || event.reason || '';
      
      if (shouldSuppressError(String(message))) {
        event.preventDefault();
        return false;
      }
    });
    
    console.debug('🔇 Error suppression initialized for wallet extensions');
    
  } catch (error) {
    // If we can't override console, fail silently
    originalError('Failed to initialize error suppression:', error);
  }
}

/**
 * Restore original console methods
 */
export function restoreConsole() {
  if (typeof window === 'undefined') {
    return;
  }
  
  console.error = originalError;
  console.warn = originalWarn;
  
  console.debug('🔊 Console methods restored');
}

/**
 * Auto-initialize when module is imported
 */
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeErrorSuppression);
  } else {
    initializeErrorSuppression();
  }
}