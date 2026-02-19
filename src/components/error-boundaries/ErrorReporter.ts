import { logger } from '@/lib/enhanced-logger'

export interface ErrorContext {
  errorId: string
  level: 'page' | 'component' | 'critical'
  componentName: string
  timestamp: string
  userAgent: string
  url: string
  userId: string | null
  sessionId: string | null
  retryCount: number
  componentStack?: string
  errorBoundary?: boolean
  [key: string]: any
}

export interface ErrorReport {
  error: {
    message: string
    stack?: string
    name: string
  }
  context: ErrorContext
  fingerprint: string
}

class ErrorReporterService {
  private errorQueue: ErrorReport[] = []
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  private maxQueueSize = 100
  private reportingEndpoint = '/api/errors'

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for online/offline events
      window.addEventListener('online', this.flushErrorQueue.bind(this))
      window.addEventListener('offline', () => {
        this.isOnline = false
      })

      // Flush errors before page unload
      window.addEventListener('beforeunload', this.flushErrorQueue.bind(this))

      // Set up periodic flushing
      setInterval(this.flushErrorQueue.bind(this), 30000) // Every 30 seconds
    }
  }

  /**
   * Report an error with context
   */
  reportError(error: Error, context: ErrorContext): void {
    const fingerprint = this.generateFingerprint(error, context)
    
    const report: ErrorReport = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context: {
        ...context,
        fingerprint
      },
      fingerprint
    }

    // Add to queue
    this.addToQueue(report)

    // Log locally
    logger.error('Error reported', {
      errorId: context.errorId,
      fingerprint,
      level: context.level,
      component: context.componentName
    })

    // Try to send immediately if online
    if (this.isOnline) {
      this.flushErrorQueue()
    }
  }

  /**
   * Report user feedback for an error
   */
  reportUserFeedback(errorId: string, feedback: string): void {
    const feedbackReport = {
      type: 'feedback',
      errorId,
      feedback,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown'
    }

    this.sendReport('/api/feedback', feedbackReport)
    
    logger.info('User feedback reported', {
      errorId,
      feedbackLength: feedback.length
    })
  }

  /**
   * Generate a fingerprint for error deduplication
   */
  private generateFingerprint(error: Error, context: ErrorContext): string {
    const errorSignature = `${error.name}:${error.message}:${context.componentName}`
    const stackSignature = error.stack ? error.stack.split('\n').slice(0, 3).join('') : ''
    
    return this.hashString(errorSignature + stackSignature)
  }

  /**
   * Simple hash function for fingerprinting
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Add error report to queue
   */
  private addToQueue(report: ErrorReport): void {
    this.errorQueue.push(report)
    
    // Prevent queue from growing too large
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize)
      logger.warn('Error queue size limit reached, dropping oldest errors')
    }

    // Store in localStorage for persistence
    this.persistQueue()
  }

  /**
   * Persist error queue to localStorage
   */
  private persistQueue(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem('cypherErrorQueue', JSON.stringify(this.errorQueue))
    } catch (error) {
      logger.warn('Failed to persist error queue', { error })
    }
  }

  /**
   * Load error queue from localStorage
   */
  private loadPersistedQueue(): void {
    if (typeof window === 'undefined') return
    
    try {
      const persistedQueue = localStorage.getItem('cypherErrorQueue')
      if (persistedQueue) {
        this.errorQueue = JSON.parse(persistedQueue)
        logger.info(`Loaded ${this.errorQueue.length} persisted errors`)
      }
    } catch (error) {
      logger.warn('Failed to load persisted error queue', { error })
    }
  }

  /**
   * Flush error queue to server
   */
  private async flushErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0) return

    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    if (!this.isOnline) return

    const reportsToSend = [...this.errorQueue]
    this.errorQueue = []

    try {
      await this.sendBatchReports(reportsToSend)
      
      // Clear persisted queue on successful send
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cypherErrorQueue')
      }
      
      logger.info(`Successfully sent ${reportsToSend.length} error reports`)
    } catch (error) {
      // Add reports back to queue if sending failed
      this.errorQueue = [...reportsToSend, ...this.errorQueue]
      this.persistQueue()
      
      logger.error('Failed to send error reports', { 
        error,
        queueSize: this.errorQueue.length 
      })
    }
  }

  /**
   * Send batch error reports to server
   */
  private async sendBatchReports(reports: ErrorReport[]): Promise<void> {
    return this.sendReport('/api/errors/batch', { reports })
  }

  /**
   * Send report to endpoint
   */
  private async sendReport(endpoint: string, data: any): Promise<void> {
    if (typeof fetch === 'undefined') return

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      // Don't log fetch errors to avoid infinite loops
      throw error
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    queueSize: number
    isOnline: boolean
    maxQueueSize: number
  } {
    return {
      queueSize: this.errorQueue.length,
      isOnline: this.isOnline,
      maxQueueSize: this.maxQueueSize
    }
  }

  /**
   * Initialize the error reporter
   */
  init(): void {
    this.loadPersistedQueue()
    
    // Set up global error handlers
    if (typeof window !== 'undefined') {
      // Catch unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.reportError(
          new Error(`Unhandled Promise Rejection: ${event.reason}`),
          {
            errorId: `unhandled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            level: 'critical',
            componentName: 'Global',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: null,
            sessionId: null,
            retryCount: 0,
            promiseRejection: true
          }
        )
      })

      // Catch global JavaScript errors
      window.addEventListener('error', (event) => {
        this.reportError(
          new Error(event.message),
          {
            errorId: `global_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            level: 'critical',
            componentName: 'Global',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: null,
            sessionId: null,
            retryCount: 0,
            filename: event.filename,
            lineNumber: event.lineno,
            columnNumber: event.colno
          }
        )
      })
    }
  }
}

// Export singleton instance
export const ErrorReporter = new ErrorReporterService()

// Initialize on import
if (typeof window !== 'undefined') {
  ErrorReporter.init()
}