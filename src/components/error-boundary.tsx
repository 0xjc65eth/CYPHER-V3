'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo })
    
    // Enhanced error handling with specific cases
    const errorMessage = error.message || ''
    
    // Handle wallet-related errors gracefully
    if (errorMessage.includes('Cannot set property ethereum') ||
        errorMessage.includes('BitcoinProvider') ||
        errorMessage.includes('Cannot convert a BigInt') ||
        errorMessage.includes('Cannot read properties of undefined')) {
      // Don't show error UI for wallet conflicts, just log them
      this.setState({ hasError: false })
      return
    }
    
    // Handle webpack module errors
    if (errorMessage.includes("Cannot read properties of undefined (reading 'call')") ||
        errorMessage.includes('webpack') ||
        errorMessage.includes('__webpack_require__')) {
      // Attempt to reload the problematic module
      setTimeout(() => {
        this.setState({ hasError: false })
      }, 1000)
      return
    }
    
    // Log error to console
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent 
          error={this.state.error!} 
          resetError={this.resetError}
        />
      )
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-red-400 mb-4">
          ⚠️ Something went wrong
        </h2>
        
        <div className="text-gray-300 mb-4">
          <p className="mb-2">An unexpected error occurred:</p>
          <pre className="text-sm bg-gray-800 p-2 rounded text-red-300 overflow-auto">
            {error.message}
          </pre>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={resetError}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>
        
        <details className="mt-4">
          <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
            Technical Details
          </summary>
          <pre className="text-xs bg-gray-800 p-2 rounded mt-2 text-gray-400 overflow-auto">
            {error.stack}
          </pre>
        </details>
      </div>
    </div>
  )
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorFallback?: React.ComponentType<{ error: Error; resetError: () => void }>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={errorFallback}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}