'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@/lib/enhanced-logger'
import { ErrorReporter } from './ErrorReporter'
import { ErrorFallbackUI } from './ErrorFallbackUI'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'page' | 'component' | 'critical'
  name?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component', name = 'Unknown', onError } = this.props
    
    // Generate error ID for tracking
    const errorId = this.state.errorId || `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Enhanced error context
    const errorContext = {
      errorId,
      level,
      componentName: name,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      retryCount: this.retryCount,
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    }

    // Log error with context
    logger.error('Error Boundary caught an error', {
      error: error.message,
      stack: error.stack,
      ...errorContext
    })

    // Report error to monitoring service
    ErrorReporter.reportError(error, errorContext as any)

    // Update state with error info
    this.setState({
      errorInfo,
      errorId
    })

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }

    // Auto-recovery for non-critical errors
    if (level !== 'critical' && this.retryCount < this.maxRetries) {
      this.scheduleRetry()
    }
  }

  private getUserId(): string | null {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem('userId') || sessionStorage.getItem('userId')
    } catch {
      return null
    }
  }

  private getSessionId(): string | null {
    if (typeof window === 'undefined') return null
    try {
      let sessionId = sessionStorage.getItem('sessionId')
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        sessionStorage.setItem('sessionId', sessionId)
      }
      return sessionId
    } catch {
      return null
    }
  }

  private scheduleRetry = () => {
    setTimeout(() => {
      this.retryCount++
      logger.info(`Attempting auto-recovery (${this.retryCount}/${this.maxRetries})`, {
        errorId: this.state.errorId,
        componentName: this.props.name
      })
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      })
    }, 2000 * this.retryCount) // Exponential backoff
  }

  private handleRetry = () => {
    this.retryCount++
    logger.info('Manual retry initiated', {
      errorId: this.state.errorId,
      retryCount: this.retryCount
    })
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  private handleReportFeedback = (feedback: string) => {
    if (this.state.errorId) {
      ErrorReporter.reportUserFeedback(this.state.errorId, feedback)
      logger.info('User feedback submitted', {
        errorId: this.state.errorId,
        feedback: feedback.substring(0, 100) // Log first 100 chars for privacy
      })
    }
  }

  render() {
    if (this.state.hasError) {
      const { fallback, level = 'component', name = 'Component' } = this.props
      
      if (fallback) {
        return fallback
      }

      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          level={level}
          componentName={name}
          retryCount={this.retryCount}
          maxRetries={this.maxRetries}
          onRetry={this.handleRetry}
          onReportFeedback={this.handleReportFeedback}
          canRetry={this.retryCount < this.maxRetries}
        />
      )
    }

    return this.props.children
  }
}

// HOC for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Hook for throwing errors that will be caught by error boundaries
export function useErrorHandler() {
  return React.useCallback((error: Error, context?: Record<string, any>) => {
    logger.error('Error thrown via useErrorHandler', { error: error.message, context })
    throw error
  }, [])
}