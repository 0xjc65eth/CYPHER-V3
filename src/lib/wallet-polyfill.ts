'use client'

// Wallet Provider Polyfill and Conflict Resolution
// Must be loaded before any wallet-related code

declare global {
  interface Window {
    oyl?: any
  }
}

// Prevent wallet provider conflicts
function initializeWalletPolyfill() {
  if (typeof window === 'undefined') return

  // Create safe wallet provider objects to prevent conflicts
  const createSafeProvider = (name: string) => {
    return new Proxy({}, {
      get(target: any, prop: string | symbol) {
        if (prop === 'isConnected') return false
        if (prop === 'isInstalled') return false
        if (prop === 'connect') return async () => { throw new Error(`${name} not available`) }
        if (prop === 'disconnect') return async () => {}
        if (prop === 'getAccounts') return async () => []
        if (prop === 'signMessage') return async () => { throw new Error(`${name} not available`) }
        return undefined
      },
      set(target: any, prop: string | symbol, value: any) {
        target[prop] = value
        return true
      }
    })
  }

  // Initialize wallet providers safely
  try {
    // Ethereum provider (MetaMask conflict prevention)
    if (!window.ethereum) {
      Object.defineProperty(window, 'ethereum', {
        value: createSafeProvider('ethereum'),
        writable: true,
        configurable: true,
        enumerable: true
      })
    }

    // Bitcoin providers
    if (!window.BitcoinProvider) {
      Object.defineProperty(window, 'BitcoinProvider', {
        value: createSafeProvider('BitcoinProvider'),
        writable: true,
        configurable: true,
        enumerable: true
      })
    }

    // Phantom wallet
    if (!window.phantom) {
      Object.defineProperty(window, 'phantom', {
        value: {
          solana: createSafeProvider('phantom.solana'),
          ethereum: createSafeProvider('phantom.ethereum'),
          bitcoin: createSafeProvider('phantom.bitcoin')
        },
        writable: true,
        configurable: true,
        enumerable: true
      })
    }

    // Other Bitcoin wallets
    const wallets = ['unisat', 'xverse', 'oyl', 'magicEden']
    wallets.forEach(wallet => {
      if (!window[wallet as keyof Window]) {
        Object.defineProperty(window, wallet, {
          value: createSafeProvider(wallet),
          writable: true,
          configurable: true,
          enumerable: true
        })
      }
    })

  } catch (error) {
    console.error('[Wallet Polyfill] Initialization error:', error)
  }
}

// Enhanced error handling for wallet operations
function handleWalletError(error: any, context: string) {
  // Handle specific error types
  if (error?.message?.includes('Cannot set property ethereum')) {
    return true // Error handled
  }

  if (error?.message?.includes('Cannot convert a BigInt')) {
    return true // Error handled
  }
  
  return false // Error not handled
}

// Global error handler for wallet-related errors
if (typeof window !== 'undefined') {
  const originalError = window.onerror
  window.onerror = function(message, source, lineno, colno, error) {
    if (typeof message === 'string') {
      if (message.includes('ethereum') || message.includes('BitcoinProvider') || message.includes('BigInt')) {
        if (handleWalletError(error, 'Global Error Handler')) {
          return true // Prevent default error handling
        }
      }
    }
    
    // Call original error handler if exists
    if (originalError) {
      return originalError.call(this, message, source, lineno, colno, error)
    }
    
    return false
  }

  // Unhandled promise rejection handler
  const originalRejection = window.onunhandledrejection
  window.onunhandledrejection = function(event) {
    if (event.reason?.message) {
      if (handleWalletError(event.reason, 'Unhandled Promise Rejection')) {
        event.preventDefault()
        return
      }
    }
    
    // Call original rejection handler if exists
    if (originalRejection) {
      return (originalRejection as Function).call(this, event)
    }
  }
}

// Initialize immediately
initializeWalletPolyfill()

export { initializeWalletPolyfill, handleWalletError }