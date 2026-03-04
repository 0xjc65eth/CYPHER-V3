/**
 * Enhanced Error Logger for Testing and Production
 * Comprehensive error tracking and analysis system
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  API = 'api',
  WALLET = 'wallet',
  TRADING = 'trading',
  VOICE_AI = 'voice_ai',
  UI = 'ui',
  NETWORK = 'network',
  VALIDATION = 'validation',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  UNKNOWN = 'unknown'
}

export interface ErrorEntry {
  id: string
  timestamp: number
  message: string
  stack?: string
  category: ErrorCategory
  severity: ErrorSeverity
  context: Record<string, any>
  userAgent?: string
  url?: string
  userId?: string
  sessionId?: string
  buildVersion?: string
  resolved: boolean
  resolvedAt?: number
  resolvedBy?: string
  tags: string[]
  count: number
  firstOccurrence: number
  lastOccurrence: number
}

export interface ErrorPattern {
  pattern: string
  count: number
  category: ErrorCategory
  severity: ErrorSeverity
  examples: string[]
}

export interface ErrorStatistics {
  totalErrors: number
  errorsByCategory: Record<ErrorCategory, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  errorRate: number
  topErrors: Array<{
    message: string
    count: number
    category: ErrorCategory
  }>
  patterns: ErrorPattern[]
  trends: Array<{
    timestamp: number
    count: number
  }>
}

export class ErrorLogger {
  private static instance: ErrorLogger
  private errors: Map<string, ErrorEntry> = new Map()
  private maxErrors = 10000
  private errorHandlers: Map<ErrorCategory, (error: ErrorEntry) => void> = new Map()
  private isTestEnvironment = false

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  constructor() {
    this.isTestEnvironment = process.env.NODE_ENV === 'test'
    this.setupGlobalErrorHandlers()
  }

  // Log an error
  logError(
    error: Error | string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Record<string, any> = {}
  ): string {
    const errorMessage = error instanceof Error ? error.message : error
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorId = this.generateErrorId(errorMessage, category)
    
    const existingError = this.errors.get(errorId)
    const now = Date.now()
    
    if (existingError) {
      // Update existing error
      existingError.count++
      existingError.lastOccurrence = now
      existingError.context = { ...existingError.context, ...context }
    } else {
      // Create new error entry
      const errorEntry: ErrorEntry = {
        id: errorId,
        timestamp: now,
        message: errorMessage,
        stack: errorStack,
        category,
        severity,
        context: {
          ...context,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          buildVersion: process.env.npm_package_version || 'unknown'
        },
        resolved: false,
        tags: this.generateTags(errorMessage, category),
        count: 1,
        firstOccurrence: now,
        lastOccurrence: now
      }
      
      this.errors.set(errorId, errorEntry)
      
      // Trigger error handlers
      const handler = this.errorHandlers.get(category)
      if (handler) {
        try {
          handler(errorEntry)
        } catch (handlerError) {
          console.error('Error handler failed:', handlerError)
        }
      }
      
      // Auto-escalate critical errors
      if (severity === ErrorSeverity.CRITICAL) {
        this.escalateError(errorEntry)
      }
    }
    
    // Cleanup old errors if limit exceeded
    this.cleanupOldErrors()
    
    // Log to console in development
    if (!this.isTestEnvironment) {
      console.error(`[${category.toUpperCase()}] ${errorMessage}`, context)
    }
    
    return errorId
  }

  // Log API error
  logAPIError(
    endpoint: string,
    method: string,
    statusCode: number,
    error: Error | string,
    requestData?: any
  ): string {
    const context = {
      endpoint,
      method,
      statusCode,
      requestData
    }
    
    const severity = statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM
    return this.logError(error, ErrorCategory.API, severity, context)
  }

  // Log wallet error
  logWalletError(
    walletType: string,
    operation: string,
    error: Error | string,
    address?: string
  ): string {
    const context = {
      walletType,
      operation,
      address: address ? this.maskSensitiveData(address) : undefined
    }
    
    return this.logError(error, ErrorCategory.WALLET, ErrorSeverity.HIGH, context)
  }

  // Log trading error
  logTradingError(
    symbol: string,
    operation: string,
    error: Error | string,
    tradeData?: any
  ): string {
    const context = {
      symbol,
      operation,
      tradeData: tradeData ? this.maskSensitiveData(tradeData) : undefined
    }
    
    return this.logError(error, ErrorCategory.TRADING, ErrorSeverity.HIGH, context)
  }

  // Log Voice AI error
  logVoiceAIError(
    command: string,
    error: Error | string,
    voiceData?: any
  ): string {
    const context = {
      command,
      voiceData
    }
    
    return this.logError(error, ErrorCategory.VOICE_AI, ErrorSeverity.MEDIUM, context)
  }

  // Log security error
  logSecurityError(
    threat: string,
    error: Error | string,
    ipAddress?: string,
    userAgent?: string
  ): string {
    const context = {
      threat,
      ipAddress,
      userAgent,
      timestamp: Date.now()
    }
    
    return this.logError(error, ErrorCategory.SECURITY, ErrorSeverity.CRITICAL, context)
  }

  // Register error handler for specific category
  registerErrorHandler(category: ErrorCategory, handler: (error: ErrorEntry) => void): void {
    this.errorHandlers.set(category, handler)
  }

  // Get error by ID
  getError(errorId: string): ErrorEntry | undefined {
    return this.errors.get(errorId)
  }

  // Get errors by category
  getErrorsByCategory(category: ErrorCategory): ErrorEntry[] {
    return Array.from(this.errors.values()).filter(error => error.category === category)
  }

  // Get errors by severity
  getErrorsBySeverity(severity: ErrorSeverity): ErrorEntry[] {
    return Array.from(this.errors.values()).filter(error => error.severity === severity)
  }

  // Get recent errors
  getRecentErrors(minutes: number = 60): ErrorEntry[] {
    const cutoff = Date.now() - (minutes * 60 * 1000)
    return Array.from(this.errors.values())
      .filter(error => error.lastOccurrence > cutoff)
      .sort((a, b) => b.lastOccurrence - a.lastOccurrence)
  }

  // Mark error as resolved
  resolveError(errorId: string, resolvedBy?: string): boolean {
    const error = this.errors.get(errorId)
    if (error) {
      error.resolved = true
      error.resolvedAt = Date.now()
      error.resolvedBy = resolvedBy
      return true
    }
    return false
  }

  // Get error statistics
  getStatistics(timeRange?: number): ErrorStatistics {
    const cutoff = timeRange ? Date.now() - timeRange : 0
    const relevantErrors = Array.from(this.errors.values())
      .filter(error => error.lastOccurrence > cutoff)
    
    const totalErrors = relevantErrors.reduce((sum, error) => sum + error.count, 0)
    
    // Group by category
    const errorsByCategory = {} as Record<ErrorCategory, number>
    Object.values(ErrorCategory).forEach(category => {
      errorsByCategory[category] = relevantErrors
        .filter(error => error.category === category)
        .reduce((sum, error) => sum + error.count, 0)
    })
    
    // Group by severity
    const errorsBySeverity = {} as Record<ErrorSeverity, number>
    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = relevantErrors
        .filter(error => error.severity === severity)
        .reduce((sum, error) => sum + error.count, 0)
    })
    
    // Calculate error rate (errors per hour)
    const timeRangeHours = timeRange ? timeRange / (1000 * 60 * 60) : 24
    const errorRate = totalErrors / timeRangeHours
    
    // Top errors
    const topErrors = relevantErrors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(error => ({
        message: error.message,
        count: error.count,
        category: error.category
      }))
    
    // Error patterns
    const patterns = this.detectErrorPatterns(relevantErrors)
    
    // Trends (hourly error counts)
    const trends = this.calculateTrends(relevantErrors, timeRange || 24 * 60 * 60 * 1000)
    
    return {
      totalErrors,
      errorsByCategory,
      errorsBySeverity,
      errorRate,
      topErrors,
      patterns,
      trends
    }
  }

  // Generate error report
  generateReport(timeRange?: number): string {
    const stats = this.getStatistics(timeRange)
    const timeRangeStr = timeRange ? `last ${timeRange / (1000 * 60 * 60)}h` : 'all time'
    
    const categoryStats = Object.entries(stats.errorsByCategory)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([category, count]) => `  ${category}: ${count}`)
      .join('\n')
    
    const severityStats = Object.entries(stats.errorsBySeverity)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([severity, count]) => `  ${severity}: ${count}`)
      .join('\n')
    
    return `
CYPHER ORDi Future V3 - Error Report (${timeRangeStr})
======================================================

Summary:
- Total Errors: ${stats.totalErrors}
- Error Rate: ${stats.errorRate.toFixed(2)} errors/hour
- Unique Error Types: ${this.errors.size}

Errors by Category:
${categoryStats || '  No errors'}

Errors by Severity:
${severityStats || '  No errors'}

Top 5 Most Frequent Errors:
${stats.topErrors.slice(0, 5).map((error, i) => 
  `${i + 1}. [${error.category.toUpperCase()}] ${error.message} (${error.count}x)`
).join('\n') || '  No errors'}

Detected Patterns:
${stats.patterns.slice(0, 3).map(pattern => 
  `- ${pattern.pattern} (${pattern.count}x, ${pattern.severity})`
).join('\n') || '  No patterns detected'}

${stats.errorsBySeverity[ErrorSeverity.CRITICAL] > 0 ? '\n🚨 CRITICAL ERRORS DETECTED - IMMEDIATE ACTION REQUIRED' : ''}
${stats.errorRate > 10 ? '\n⚠️  HIGH ERROR RATE - SYSTEM MONITORING RECOMMENDED' : ''}
`
  }

  // Clear all errors
  clearErrors(): void {
    this.errors.clear()
  }

  // Export errors for analysis
  exportErrors(): ErrorEntry[] {
    return Array.from(this.errors.values())
  }

  // Private methods
  private generateErrorId(message: string, category: ErrorCategory): string {
    const hash = this.hashString(message + category)
    return `${category}_${hash}`
  }

  private generateTags(message: string, category: ErrorCategory): string[] {
    const tags: string[] = [category]

    // Auto-generate tags based on message content
    if (message.toLowerCase().includes('timeout')) tags.push('timeout')
    if (message.toLowerCase().includes('network')) tags.push('network')
    if (message.toLowerCase().includes('auth')) tags.push('authentication')
    if (message.toLowerCase().includes('permission')) tags.push('permissions')
    if (message.toLowerCase().includes('rate limit')) tags.push('rate-limit')
    if (message.toLowerCase().includes('bigint')) tags.push('bigint')
    if (message.toLowerCase().includes('wallet')) tags.push('wallet')

    return tags
  }

  private maskSensitiveData(data: any): any {
    if (typeof data === 'string') {
      // Mask addresses, private keys, etc.
      return data.replace(/^(bc1|[13])[a-km-zA-HJ-NP-Z0-9]{25,62}$/g, (match) => 
        match.substring(0, 6) + '...' + match.substring(match.length - 4)
      )
    }
    
    if (typeof data === 'object' && data !== null) {
      const masked = { ...data }
      const sensitiveKeys = ['privateKey', 'mnemonic', 'password', 'secret', 'token']
      
      sensitiveKeys.forEach(key => {
        if (key in masked) {
          masked[key] = '[REDACTED]'
        }
      })
      
      return masked
    }
    
    return data
  }

  private escalateError(error: ErrorEntry): void {
    // In production, this would send alerts to monitoring systems
    console.error('🚨 CRITICAL ERROR ESCALATED:', {
      id: error.id,
      message: error.message,
      category: error.category,
      context: error.context
    })
  }

  private cleanupOldErrors(): void {
    if (this.errors.size > this.maxErrors) {
      const sortedErrors = Array.from(this.errors.entries())
        .sort(([, a], [, b]) => a.lastOccurrence - b.lastOccurrence)
      
      const toDelete = sortedErrors.slice(0, this.errors.size - this.maxErrors)
      toDelete.forEach(([id]) => this.errors.delete(id))
    }
  }

  private detectErrorPatterns(errors: ErrorEntry[]): ErrorPattern[] {
    const patterns: Map<string, ErrorPattern> = new Map()
    
    errors.forEach(error => {
      // Simple pattern detection based on common error message patterns
      const message = error.message.toLowerCase()
      let pattern = ''
      
      if (message.includes('failed to fetch')) {
        pattern = 'Network connectivity issues'
      } else if (message.includes('timeout')) {
        pattern = 'Timeout errors'
      } else if (message.includes('unauthorized') || message.includes('403')) {
        pattern = 'Authorization failures'
      } else if (message.includes('not found') || message.includes('404')) {
        pattern = 'Resource not found'
      } else if (message.includes('bigint')) {
        pattern = 'BigInt serialization issues'
      } else if (message.includes('wallet')) {
        pattern = 'Wallet connection issues'
      } else {
        return // Skip if no pattern detected
      }
      
      const existing = patterns.get(pattern)
      if (existing) {
        existing.count += error.count
        existing.examples.push(error.message)
      } else {
        patterns.set(pattern, {
          pattern,
          count: error.count,
          category: error.category,
          severity: error.severity,
          examples: [error.message]
        })
      }
    })
    
    return Array.from(patterns.values())
      .sort((a, b) => b.count - a.count)
  }

  private calculateTrends(errors: ErrorEntry[], timeRange: number): Array<{ timestamp: number; count: number }> {
    const now = Date.now()
    const buckets = 24 // 24 hourly buckets
    const bucketSize = timeRange / buckets
    const trends: Array<{ timestamp: number; count: number }> = []
    
    for (let i = 0; i < buckets; i++) {
      const bucketStart = now - timeRange + (i * bucketSize)
      const bucketEnd = bucketStart + bucketSize
      
      const count = errors.reduce((sum, error) => {
        if (error.lastOccurrence >= bucketStart && error.lastOccurrence < bucketEnd) {
          return sum + error.count
        }
        return sum
      }, 0)
      
      trends.push({
        timestamp: bucketStart,
        count
      })
    }
    
    return trends
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      // Browser error handlers
      window.addEventListener('error', (event) => {
        this.logError(
          event.error || event.message,
          ErrorCategory.UI,
          ErrorSeverity.MEDIUM,
          {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        )
      })
      
      window.addEventListener('unhandledrejection', (event) => {
        this.logError(
          event.reason,
          ErrorCategory.UNKNOWN,
          ErrorSeverity.HIGH,
          { type: 'unhandledrejection' }
        )
      })
    }
  }

  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}

export default ErrorLogger.getInstance()