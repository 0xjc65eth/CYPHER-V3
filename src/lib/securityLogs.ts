/**
 * Security Logging & Audit System
 * Comprehensive logging system for wallet security events
 * 
 * @version 1.0.0
 * @author CYPHER ORDI FUTURE - Agent 5
 */

// Log Level Enum
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

// Security Event Types
export enum SecurityEventType {
  WALLET_CONNECTION_ATTEMPT = 'WALLET_CONNECTION_ATTEMPT',
  WALLET_CONNECTION_SUCCESS = 'WALLET_CONNECTION_SUCCESS',
  WALLET_CONNECTION_FAILED = 'WALLET_CONNECTION_FAILED',
  WALLET_CONNECTION_TIMEOUT = 'WALLET_CONNECTION_TIMEOUT',
  WALLET_DISCONNECTION = 'WALLET_DISCONNECTION',
  SIGNATURE_VALIDATION = 'SIGNATURE_VALIDATION',
  SIGNATURE_VALIDATION_ERROR = 'SIGNATURE_VALIDATION_ERROR',
  ADDRESS_VALIDATION = 'ADDRESS_VALIDATION',
  ADDRESS_VALIDATION_FAILED = 'ADDRESS_VALIDATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SECURITY_SYSTEM_INITIALIZED = 'SECURITY_SYSTEM_INITIALIZED',
  SECURITY_CONFIG_UPDATED = 'SECURITY_CONFIG_UPDATED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SECURITY_BREACH_ATTEMPT = 'SECURITY_BREACH_ATTEMPT',
  INSECURE_CONNECTION_BLOCKED = 'INSECURE_CONNECTION_BLOCKED',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  WALLET_CONNECTION_ERROR = 'WALLET_CONNECTION_ERROR',
  TRANSACTION_VALIDATION = 'TRANSACTION_VALIDATION',
  TRANSACTION_VALIDATION_ERROR = 'TRANSACTION_VALIDATION_ERROR',
  SESSION_IDLE_TIMEOUT = 'SESSION_IDLE_TIMEOUT',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  ADDRESS_WHITELISTED = 'ADDRESS_WHITELISTED',
  ADDRESS_REMOVED_FROM_WHITELIST = 'ADDRESS_REMOVED_FROM_WHITELIST',
  SUSPICIOUS_ACTIVITY_MARKED = 'SUSPICIOUS_ACTIVITY_MARKED',
  SUSPICIOUS_ACTIVITY_CLEARED = 'SUSPICIOUS_ACTIVITY_CLEARED',
  LOGS_CLEARED = 'LOGS_CLEARED'
}

// Security Log Entry
export interface SecurityLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  eventType: SecurityEventType;
  message: string;
  details: Record<string, any>;
  sessionId?: string;
  walletAddress?: string;
  walletProvider?: string;
  ipAddress?: string;
  userAgent?: string;
  stackTrace?: string;
  correlationId?: string;
}

// Log Configuration
export interface LogConfig {
  enableConsoleLogging: boolean;
  enableLocalStorage: boolean;
  enableRemoteLogging: boolean;
  maxLocalStorageEntries: number;
  logRetentionDays: number;
  minLogLevel: LogLevel;
  enableStackTrace: boolean;
  remoteEndpoint?: string;
  apiKey?: string;
  batchSize: number;
  flushInterval: number;
}

// Log Summary for audit reports
export interface LogSummary {
  totalEntries: number;
  totalConnections: number;
  failedAttempts: number;
  securityIncidents: number;
  lastActivity: Date;
  topEventTypes: { type: SecurityEventType; count: number }[];
  warnings: string[];
  criticalEvents: SecurityLogEntry[];
}

// Default log configuration
const DEFAULT_LOG_CONFIG: LogConfig = {
  enableConsoleLogging: true,
  enableLocalStorage: true,
  enableRemoteLogging: false,
  maxLocalStorageEntries: 1000,
  logRetentionDays: 30,
  minLogLevel: LogLevel.INFO,
  enableStackTrace: true,
  batchSize: 50,
  flushInterval: 30000 // 30 seconds
};

/**
 * Security Logger Class
 */
export class SecurityLogger {
  private config: LogConfig;
  private logs: SecurityLogEntry[] = [];
  private logQueue: SecurityLogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private readonly storageKey = 'cypher_security_logs';
  private readonly maxMemoryEntries = 500;

  constructor(config?: Partial<LogConfig>) {
    this.config = { ...DEFAULT_LOG_CONFIG, ...config };
    this.initializeLogger();
  }

  /**
   * Initialize logger
   */
  private initializeLogger(): void {
    // Load existing logs from localStorage
    this.loadLogsFromStorage();
    
    // Setup remote logging flush timer
    if (this.config.enableRemoteLogging) {
      this.startFlushTimer();
    }

    // Setup cleanup timer
    this.startCleanupTimer();

    this.logSecurityEvent('SECURITY_SYSTEM_INITIALIZED', {
      config: {
        enableConsoleLogging: this.config.enableConsoleLogging,
        enableLocalStorage: this.config.enableLocalStorage,
        enableRemoteLogging: this.config.enableRemoteLogging,
        minLogLevel: this.config.minLogLevel
      }
    });
  }

  /**
   * Log a security event
   */
  logSecurityEvent(
    eventType: SecurityEventType,
    details: Record<string, any> = {},
    level: LogLevel = LogLevel.INFO,
    sessionId?: string,
    correlationId?: string
  ): void {
    try {
      const logEntry = this.createLogEntry(
        eventType,
        details,
        level,
        sessionId,
        correlationId
      );

      // Check if log level meets minimum threshold
      if (!this.shouldLog(level)) {
        return;
      }

      // Add to memory logs
      this.addToMemoryLogs(logEntry);

      // Console logging
      if (this.config.enableConsoleLogging) {
        this.logToConsole(logEntry);
      }

      // Local storage logging
      if (this.config.enableLocalStorage) {
        this.logToLocalStorage(logEntry);
      }

      // Remote logging queue
      if (this.config.enableRemoteLogging) {
        this.addToRemoteQueue(logEntry);
      }

      // Check for critical events
      if (level === LogLevel.CRITICAL || level === LogLevel.ERROR) {
        this.handleCriticalEvent(logEntry);
      }

    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Log wallet connection attempt
   */
  logWalletConnection(
    success: boolean,
    walletProvider: string,
    walletAddress?: string,
    sessionId?: string,
    error?: string
  ): void {
    const eventType = success 
      ? SecurityEventType.WALLET_CONNECTION_SUCCESS
      : SecurityEventType.WALLET_CONNECTION_FAILED;

    const details: Record<string, any> = {
      walletProvider,
      timestamp: new Date().toISOString()
    };

    if (walletAddress) {
      details.walletAddress = this.anonymizeAddress(walletAddress);
    }

    if (error) {
      details.error = error;
    }

    this.logSecurityEvent(
      eventType,
      details,
      success ? LogLevel.INFO : LogLevel.WARN,
      sessionId
    );
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(
    description: string,
    details: Record<string, any> = {},
    sessionId?: string
  ): void {
    this.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      {
        description,
        ...details,
        severity: 'HIGH'
      },
      LogLevel.WARN,
      sessionId
    );
  }

  /**
   * Log security breach attempt
   */
  logSecurityBreach(
    description: string,
    details: Record<string, any> = {},
    sessionId?: string
  ): void {
    this.logSecurityEvent(
      SecurityEventType.SECURITY_BREACH_ATTEMPT,
      {
        description,
        ...details,
        severity: 'CRITICAL'
      },
      LogLevel.CRITICAL,
      sessionId
    );
  }

  /**
   * Get log summary for audit reports
   */
  getLogSummary(timeframe?: { start: Date; end: Date }): LogSummary {
    let relevantLogs = this.logs;

    if (timeframe) {
      relevantLogs = this.logs.filter(log => 
        log.timestamp >= timeframe.start && log.timestamp <= timeframe.end
      );
    }

    const eventTypeCounts = new Map<SecurityEventType, number>();
    const criticalEvents: SecurityLogEntry[] = [];
    const warnings: string[] = [];

    let totalConnections = 0;
    let failedAttempts = 0;
    let securityIncidents = 0;

    relevantLogs.forEach(log => {
      // Count event types
      const currentCount = eventTypeCounts.get(log.eventType) || 0;
      eventTypeCounts.set(log.eventType, currentCount + 1);

      // Count specific metrics
      if (log.eventType === SecurityEventType.WALLET_CONNECTION_SUCCESS) {
        totalConnections++;
      }

      if (log.eventType === SecurityEventType.WALLET_CONNECTION_FAILED ||
          log.eventType === SecurityEventType.WALLET_CONNECTION_TIMEOUT) {
        failedAttempts++;
      }

      if (log.eventType === SecurityEventType.SUSPICIOUS_ACTIVITY ||
          log.eventType === SecurityEventType.SECURITY_BREACH_ATTEMPT) {
        securityIncidents++;
      }

      // Collect critical events
      if (log.level === LogLevel.CRITICAL || log.level === LogLevel.ERROR) {
        criticalEvents.push(log);
      }

      // Collect warnings
      if (log.level === LogLevel.WARN) {
        warnings.push(log.message);
      }
    });

    const topEventTypes = Array.from(eventTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const lastActivity = relevantLogs.length > 0 
      ? new Date(Math.max(...relevantLogs.map(log => log.timestamp.getTime())))
      : new Date();

    return {
      totalEntries: relevantLogs.length,
      totalConnections,
      failedAttempts,
      securityIncidents,
      lastActivity,
      topEventTypes,
      warnings: [...new Set(warnings)].slice(0, 10),
      criticalEvents: criticalEvents.slice(-10)
    };
  }

  /**
   * Get logs by event type
   */
  getLogsByEventType(eventType: SecurityEventType): SecurityLogEntry[] {
    return this.logs.filter(log => log.eventType === eventType);
  }

  /**
   * Get logs by session
   */
  getLogsBySession(sessionId: string): SecurityLogEntry[] {
    return this.logs.filter(log => log.sessionId === sessionId);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): SecurityLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Search logs
   */
  searchLogs(query: string): SecurityLogEntry[] {
    const lowercaseQuery = query.toLowerCase();
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(lowercaseQuery) ||
      log.eventType.toLowerCase().includes(lowercaseQuery) ||
      JSON.stringify(log.details).toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Export logs
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportToCSV();
    }
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
    this.logQueue = [];
    
    if (this.config.enableLocalStorage) {
      localStorage.removeItem(this.storageKey);
    }

    this.logSecurityEvent('LOGS_CLEARED', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LogConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Restart timers if needed
    if (oldConfig.enableRemoteLogging !== newConfig.enableRemoteLogging ||
        oldConfig.flushInterval !== newConfig.flushInterval) {
      this.stopFlushTimer();
      if (this.config.enableRemoteLogging) {
        this.startFlushTimer();
      }
    }

    this.logSecurityEvent('SECURITY_CONFIG_UPDATED', {
      oldConfig: {
        enableConsoleLogging: oldConfig.enableConsoleLogging,
        enableLocalStorage: oldConfig.enableLocalStorage,
        enableRemoteLogging: oldConfig.enableRemoteLogging,
        minLogLevel: oldConfig.minLogLevel
      },
      newConfig: {
        enableConsoleLogging: this.config.enableConsoleLogging,
        enableLocalStorage: this.config.enableLocalStorage,
        enableRemoteLogging: this.config.enableRemoteLogging,
        minLogLevel: this.config.minLogLevel
      }
    });
  }

  // Private methods
  private createLogEntry(
    eventType: SecurityEventType,
    details: Record<string, any>,
    level: LogLevel,
    sessionId?: string,
    correlationId?: string
  ): SecurityLogEntry {
    const entry: SecurityLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      eventType,
      message: this.generateLogMessage(eventType, details),
      details: this.sanitizeDetails(details),
      sessionId,
      correlationId
    };

    // Add browser information if available
    if (typeof window !== 'undefined') {
      entry.userAgent = navigator.userAgent;
    }

    // Add stack trace for errors
    if (this.config.enableStackTrace && (level === LogLevel.ERROR || level === LogLevel.CRITICAL)) {
      entry.stackTrace = new Error().stack;
    }

    return entry;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogMessage(eventType: SecurityEventType, details: Record<string, any>): string {
    switch (eventType) {
      case SecurityEventType.WALLET_CONNECTION_SUCCESS:
        return `Wallet connection successful: ${details.walletProvider}`;
      case SecurityEventType.WALLET_CONNECTION_FAILED:
        return `Wallet connection failed: ${details.walletProvider} - ${details.error || 'Unknown error'}`;
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        return `Rate limit exceeded for ${details.identifier}`;
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        return `Suspicious activity detected: ${details.description}`;
      case SecurityEventType.SECURITY_BREACH_ATTEMPT:
        return `Security breach attempt: ${details.description}`;
      default:
        return `Security event: ${eventType}`;
    }
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    
    // Remove or mask sensitive information
    if (sanitized.privateKey) delete sanitized.privateKey;
    if (sanitized.password) delete sanitized.password;
    if (sanitized.apiKey) sanitized.apiKey = '[REDACTED]';
    if (sanitized.walletAddress) {
      sanitized.walletAddress = this.anonymizeAddress(sanitized.walletAddress);
    }

    return sanitized;
  }

  private anonymizeAddress(address: string): string {
    if (address.length <= 8) return address;
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL];
    const minIndex = levels.indexOf(this.config.minLogLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }

  private addToMemoryLogs(entry: SecurityLogEntry): void {
    this.logs.push(entry);
    
    // Maintain memory limit
    if (this.logs.length > this.maxMemoryEntries) {
      this.logs = this.logs.slice(-this.maxMemoryEntries);
    }
  }

  private logToConsole(entry: SecurityLogEntry): void {
    const message = `[${entry.level}] ${entry.timestamp.toISOString()} - ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.details);
        break;
      case LogLevel.INFO:
        break;
      case LogLevel.WARN:
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, entry.details);
        break;
    }
  }

  private logToLocalStorage(entry: SecurityLogEntry): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      const logs: SecurityLogEntry[] = stored ? JSON.parse(stored) : [];
      
      logs.push(entry);
      
      // Maintain size limit
      if (logs.length > this.config.maxLocalStorageEntries) {
        logs.splice(0, logs.length - this.config.maxLocalStorageEntries);
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save log to localStorage:', error);
    }
  }

  private loadLogsFromStorage(): void {
    if (!this.config.enableLocalStorage || typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const logs: SecurityLogEntry[] = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        logs.forEach(log => {
          log.timestamp = new Date(log.timestamp);
        });
        this.logs = logs.slice(-this.maxMemoryEntries);
      }
    } catch (error) {
      console.error('Failed to load logs from localStorage:', error);
    }
  }

  private addToRemoteQueue(entry: SecurityLogEntry): void {
    this.logQueue.push(entry);
    
    if (this.logQueue.length >= this.config.batchSize) {
      this.flushRemoteLogs();
    }
  }

  private async flushRemoteLogs(): Promise<void> {
    if (this.logQueue.length === 0 || !this.config.remoteEndpoint) return;
    
    const logsToSend = [...this.logQueue];
    this.logQueue = [];
    
    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({ logs: logsToSend })
      });
      
      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
      // Re-queue failed logs
      this.logQueue.unshift(...logsToSend);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushRemoteLogs();
    }, this.config.flushInterval);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private startCleanupTimer(): void {
    // Run cleanup daily
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000);
  }

  private cleanupOldLogs(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.logRetentionDays);
    
    this.logs = this.logs.filter(log => log.timestamp >= cutoffDate);
    
    // Update localStorage
    if (this.config.enableLocalStorage) {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    }
  }

  private handleCriticalEvent(entry: SecurityLogEntry): void {
    // Could trigger alerts, notifications, etc.
    console.error('CRITICAL SECURITY EVENT:', entry);
    
    // Could send immediate notification to security team
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      fetch(this.config.remoteEndpoint + '/critical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({ criticalEvent: entry })
      }).catch(error => {
        console.error('Failed to send critical event notification:', error);
      });
    }
  }

  private exportToCSV(): string {
    const headers = ['ID', 'Timestamp', 'Level', 'Event Type', 'Message', 'Session ID', 'Wallet Address'];
    const rows = this.logs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.level,
      log.eventType,
      log.message.replace(/"/g, '""'), // Escape quotes
      log.sessionId || '',
      log.walletAddress || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    return csvContent;
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger();

// Export types
export type {
  SecurityLogEntry,
  LogConfig,
  LogSummary
};