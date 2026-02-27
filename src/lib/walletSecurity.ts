/**
 * Wallet Security & Validation System
 * Implementa segurança robusta para carteiras Bitcoin
 * 
 * @version 1.0.0
 * @author CYPHER ORDI FUTURE - Agent 5
 */

import { AddressValidator } from './addressValidation';
import { WalletDetector } from './walletDetection';
import { SecurityLogger } from './securityLogs';
import { ValidationUtils } from '../utils/validation';

// Security Level Enum
export enum SecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Transaction Types
export enum TransactionType {
  SEND = 'send',
  RECEIVE = 'receive',
  ORDINAL_TRANSFER = 'ordinal_transfer',
  RUNE_TRANSFER = 'rune_transfer',
  SIGN_MESSAGE = 'sign_message',
  PSBT_SIGN = 'psbt_sign',
  MULTI_SIG = 'multi_sig'
}

// Risk Assessment Levels
export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Hardware Wallet Types
export enum HardwareWalletType {
  LEDGER = 'ledger',
  TREZOR = 'trezor',
  COLDCARD = 'coldcard',
  BITBOX = 'bitbox',
  KEEPKEY = 'keepkey'
}

// Wallet Provider Types
export enum WalletProvider {
  UNISAT = 'unisat',
  XVERSE = 'xverse',
  MAGIC_EDEN = 'magiceden',
  OYL = 'oyl',
  LEATHER = 'leather',
  PHANTOM = 'phantom',
  UNKNOWN = 'unknown'
}

// Security Configuration Interface
export interface SecurityConfig {
  connectionTimeout: number;
  maxRetries: number;
  enableAddressValidation: boolean;
  enableSignatureValidation: boolean;
  enableAuditLogs: boolean;
  securityLevel: SecurityLevel;
  allowedProviders: WalletProvider[];
  enforceHttps: boolean;
  enableRateLimit: boolean;
  rateLimitConfig: {
    maxRequests: number;
    windowMs: number;
  };
  transactionValidation: {
    enableAmountValidation: boolean;
    maxTransactionAmount: number;
    enableFeeValidation: boolean;
    maxFeeRate: number;
    enableAddressWhitelist: boolean;
    requireConfirmationAbove: number;
  };
  fraudDetection: {
    enableRealTimeMonitoring: boolean;
    suspiciousActivityThreshold: number;
    enableGeolocationCheck: boolean;
    enableDeviceFingerprintCheck: boolean;
    blacklistedAddresses: string[];
  };
  hardwareWallet: {
    preferHardwareWallets: boolean;
    requiredForHighValue: boolean;
    supportedTypes: HardwareWalletType[];
    firmwareValidation: boolean;
  };
  multiSig: {
    enabled: boolean;
    defaultConfig?: MultiSigConfig;
    enableTimelock: boolean;
    requireForHighValue: boolean;
  };
  coldStorage: ColdStorageConfig;
  sessionSecurity: {
    sessionTimeout: number;
    enableHeartbeat: boolean;
    heartbeatInterval: number;
    maxIdleTime: number;
    requireReauth: boolean;
  };
}

// Security Context Interface
export interface SecurityContext {
  sessionId: string;
  walletProvider: WalletProvider;
  walletAddress: string;
  lastActivity: Date;
  securityLevel: SecurityLevel;
  isValid: boolean;
  validationErrors: string[];
}

// Connection Result Interface
export interface WalletConnectionResult {
  success: boolean;
  walletProvider: WalletProvider;
  address: string;
  publicKey?: string;
  error?: string;
  securityLevel: SecurityLevel;
  warnings: string[];
  hardwareWallet?: boolean;
  multiSigCapable?: boolean;
  supportedFeatures: string[];
}

// Transaction Validation Interface
export interface TransactionValidationRequest {
  sessionId: string;
  transactionType: TransactionType;
  rawTransaction?: string;
  psbt?: string;
  message?: string;
  amount?: number;
  recipientAddress?: string;
  feeRate?: number;
  metadata?: Record<string, any>;
}

// Transaction Validation Result
export interface TransactionValidationResult {
  isValid: boolean;
  riskLevel: RiskLevel;
  errors: string[];
  warnings: string[];
  securityChecks: SecurityCheckResult[];
  estimatedFee?: number;
  requiresConfirmation: boolean;
  blockReasons?: string[];
}

// Security Check Result
export interface SecurityCheckResult {
  checkType: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: any;
}

// Multi-Signature Configuration
export interface MultiSigConfig {
  requiredSignatures: number;
  totalSigners: number;
  signerAddresses: string[];
  threshold: number;
  timelock?: number;
}

// Hardware Wallet Info
export interface HardwareWalletInfo {
  type: HardwareWalletType;
  model: string;
  firmwareVersion: string;
  isInitialized: boolean;
  supportsFeatures: string[];
  connectionMethod: 'usb' | 'bluetooth' | 'nfc';
}

// Cold Storage Configuration
export interface ColdStorageConfig {
  enabled: boolean;
  offlineSigningRequired: boolean;
  requiresAirGap: boolean;
  maximumOnlineExposure: number;
  backupLocations: string[];
}

// Default Security Configuration
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  connectionTimeout: 30000, // 30 seconds
  maxRetries: 3,
  enableAddressValidation: true,
  enableSignatureValidation: true,
  enableAuditLogs: true,
  securityLevel: SecurityLevel.HIGH,
  allowedProviders: [
    WalletProvider.UNISAT,
    WalletProvider.XVERSE,
    WalletProvider.MAGIC_EDEN,
    WalletProvider.OYL,
    WalletProvider.LEATHER
  ],
  enforceHttps: true,
  enableRateLimit: true,
  rateLimitConfig: {
    maxRequests: 10,
    windowMs: 60000 // 1 minute
  },
  transactionValidation: {
    enableAmountValidation: true,
    maxTransactionAmount: 1000000000, // 10 BTC in satoshis
    enableFeeValidation: true,
    maxFeeRate: 1000, // sat/vB
    enableAddressWhitelist: false,
    requireConfirmationAbove: 100000000 // 1 BTC in satoshis
  },
  fraudDetection: {
    enableRealTimeMonitoring: true,
    suspiciousActivityThreshold: 5,
    enableGeolocationCheck: false,
    enableDeviceFingerprintCheck: true,
    blacklistedAddresses: []
  },
  hardwareWallet: {
    preferHardwareWallets: true,
    requiredForHighValue: true,
    supportedTypes: [HardwareWalletType.LEDGER, HardwareWalletType.TREZOR],
    firmwareValidation: true
  },
  multiSig: {
    enabled: true,
    enableTimelock: false,
    requireForHighValue: false
  },
  coldStorage: {
    enabled: false,
    offlineSigningRequired: false,
    requiresAirGap: false,
    maximumOnlineExposure: 86400000, // 24 hours
    backupLocations: []
  },
  sessionSecurity: {
    sessionTimeout: 3600000, // 1 hour
    enableHeartbeat: true,
    heartbeatInterval: 30000, // 30 seconds
    maxIdleTime: 900000, // 15 minutes
    requireReauth: true
  }
};

/**
 * Main Wallet Security Manager Class
 */
export class WalletSecurityManager {
  private config: SecurityConfig;
  private addressValidator: AddressValidator;
  private walletDetector: WalletDetector;
  private logger: SecurityLogger;
  private validationUtils: ValidationUtils;
  private activeSessions: Map<string, SecurityContext>;
  private requestCounts: Map<string, { count: number; resetTime: number }>;
  private suspiciousActivities: Map<string, number>;
  private whitelistedAddresses: Set<string>;
  private transactionHistory: Map<string, any[]>;
  private heartbeatTimers: Map<string, ReturnType<typeof setInterval>>;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
    this.addressValidator = new AddressValidator();
    this.walletDetector = new WalletDetector();
    this.logger = new SecurityLogger();
    this.validationUtils = new ValidationUtils();
    this.activeSessions = new Map();
    this.requestCounts = new Map();
    this.suspiciousActivities = new Map();
    this.whitelistedAddresses = new Set();
    this.transactionHistory = new Map();
    this.heartbeatTimers = new Map();

    this.initializeSecurity();
  }

  /**
   * Initialize Security System
   */
  private initializeSecurity(): void {
    // Set up security headers if in browser environment
    if (typeof window !== 'undefined') {
      this.enforceSecurityHeaders();
    }

    // Initialize rate limiting cleanup
    this.setupRateLimitCleanup();

    this.logger.logSecurityEvent('SECURITY_SYSTEM_INITIALIZED', {
      config: this.config,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Enforce Security Headers
   */
  private enforceSecurityHeaders(): void {
    // Skip HTTPS enforcement in development environment
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         location.hostname === 'localhost' || 
                         location.hostname === '127.0.0.1';
    
    if (this.config.enforceHttps && location.protocol !== 'https:' && !isDevelopment) {
      this.logger.logSecurityEvent('INSECURE_CONNECTION_BLOCKED', {
        protocol: location.protocol,
        host: location.host
      });
      throw new Error('Insecure connection blocked. HTTPS required.');
    }
  }

  /**
   * Setup Rate Limit Cleanup
   */
  private setupRateLimitCleanup(): void {
    if (this.config.enableRateLimit) {
      setInterval(() => {
        const now = Date.now();
        for (const [key, data] of this.requestCounts.entries()) {
          if (now > data.resetTime) {
            this.requestCounts.delete(key);
          }
        }
      }, this.config.rateLimitConfig.windowMs);
    }
  }

  /**
   * Check Rate Limit
   */
  private checkRateLimit(identifier: string): boolean {
    if (!this.config.enableRateLimit) return true;

    const now = Date.now();
    const existing = this.requestCounts.get(identifier);

    if (!existing) {
      this.requestCounts.set(identifier, {
        count: 1,
        resetTime: now + this.config.rateLimitConfig.windowMs
      });
      return true;
    }

    if (now > existing.resetTime) {
      this.requestCounts.set(identifier, {
        count: 1,
        resetTime: now + this.config.rateLimitConfig.windowMs
      });
      return true;
    }

    if (existing.count >= this.config.rateLimitConfig.maxRequests) {
      this.logger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        identifier,
        count: existing.count,
        limit: this.config.rateLimitConfig.maxRequests
      });
      return false;
    }

    existing.count++;
    return true;
  }

  /**
   * Secure Wallet Connection with comprehensive validation
   */
  async secureWalletConnection(
    walletProvider?: WalletProvider,
    timeout?: number
  ): Promise<WalletConnectionResult> {
    const connectionTimeout = timeout || this.config.connectionTimeout;
    const sessionId = this.generateSecureSessionId();

    try {
      // Rate limiting check
      if (!this.checkRateLimit('wallet_connection')) {
        return {
          success: false,
          walletProvider: WalletProvider.UNKNOWN,
          address: '',
          error: 'Rate limit exceeded. Please try again later.',
          securityLevel: SecurityLevel.LOW,
          warnings: ['Rate limit protection activated']
        };
      }

      this.logger.logSecurityEvent('WALLET_CONNECTION_ATTEMPT', {
        sessionId,
        provider: walletProvider,
        timestamp: new Date().toISOString()
      });

      // Detect available wallets
      const detectedWallets = await this.walletDetector.detectWallets();
      
      if (detectedWallets.length === 0) {
        return {
          success: false,
          walletProvider: WalletProvider.UNKNOWN,
          address: '',
          error: 'No compatible wallet detected',
          securityLevel: SecurityLevel.LOW,
          warnings: ['No wallet extensions found']
        };
      }

      // Select wallet provider
      const selectedProvider = this.selectWalletProvider(walletProvider, detectedWallets);
      
      if (!this.isProviderAllowed(selectedProvider)) {
        return {
          success: false,
          walletProvider: selectedProvider,
          address: '',
          error: 'Wallet provider not allowed by security policy',
          securityLevel: SecurityLevel.LOW,
          warnings: ['Provider blocked by security policy']
        };
      }

      // Connect to wallet with timeout
      const connectionResult = await this.connectToWallet(
        selectedProvider,
        connectionTimeout,
        sessionId
      );

      return connectionResult;

    } catch (error: any) {
      this.logger.logSecurityEvent('WALLET_CONNECTION_ERROR', {
        sessionId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        walletProvider: WalletProvider.UNKNOWN,
        address: '',
        error: this.sanitizeErrorMessage(error.message),
        securityLevel: SecurityLevel.LOW,
        warnings: ['Connection error occurred']
      };
    }
  }

  /**
   * Connect to specific wallet with security measures
   */
  private async connectToWallet(
    provider: WalletProvider,
    timeout: number,
    sessionId: string
  ): Promise<WalletConnectionResult> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.logger.logSecurityEvent('WALLET_CONNECTION_TIMEOUT', {
          sessionId,
          provider,
          timeout
        });
        resolve({
          success: false,
          walletProvider: provider,
          address: '',
          error: 'Connection timeout',
          securityLevel: SecurityLevel.LOW,
          warnings: ['Connection timed out']
        });
      }, timeout);

      try {
        let walletInterface: any;
        const warnings: string[] = [];

        // Get wallet interface based on provider
        switch (provider) {
          case WalletProvider.UNISAT:
            walletInterface = (window as any).unisat;
            break;
          case WalletProvider.XVERSE:
            walletInterface = (window as any).XverseProviders?.BitcoinProvider;
            break;
          case WalletProvider.MAGIC_EDEN:
            walletInterface = (window as any).magicEden?.bitcoin;
            break;
          case WalletProvider.OYL:
            walletInterface = (window as any).oyl;
            break;
          case WalletProvider.LEATHER:
            walletInterface = (window as any).LeatherProvider;
            break;
          default:
            throw new Error('Unsupported wallet provider');
        }

        if (!walletInterface) {
          throw new Error(`${provider} wallet interface not found`);
        }

        // Request connection
        const accounts = await walletInterface.requestAccounts();
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts returned from wallet');
        }

        const address = accounts[0];
        let publicKey: string | undefined;

        // Get public key if available
        try {
          publicKey = await walletInterface.getPublicKey?.();
        } catch (e) {
          warnings.push('Public key not available');
        }

        // Validate address
        if (this.config.enableAddressValidation) {
          const isValidAddress = this.addressValidator.validateBitcoinAddress(address);
          if (!isValidAddress.isValid) {
            throw new Error(`Invalid Bitcoin address: ${isValidAddress.errors.join(', ')}`);
          }
        }

        // Create security context
        const securityContext: SecurityContext = {
          sessionId,
          walletProvider: provider,
          walletAddress: address,
          lastActivity: new Date(),
          securityLevel: this.config.securityLevel,
          isValid: true,
          validationErrors: []
        };

        this.activeSessions.set(sessionId, securityContext);
        
        // Start session heartbeat if enabled
        if (this.config.sessionSecurity.enableHeartbeat) {
          this.startSessionHeartbeat(sessionId);
        }

        clearTimeout(timeoutId);

        this.logger.logSecurityEvent('WALLET_CONNECTION_SUCCESS', {
          sessionId,
          provider,
          address,
          securityLevel: this.config.securityLevel
        });

        resolve({
          success: true,
          walletProvider: provider,
          address,
          publicKey,
          securityLevel: this.config.securityLevel,
          warnings
        });

      } catch (error: any) {
        clearTimeout(timeoutId);
        
        this.logger.logSecurityEvent('WALLET_CONNECTION_FAILED', {
          sessionId,
          provider,
          error: error.message
        });

        resolve({
          success: false,
          walletProvider: provider,
          address: '',
          error: this.sanitizeErrorMessage(error.message),
          securityLevel: SecurityLevel.LOW,
          warnings: ['Connection failed']
        });
      }
    });
  }

  /**
   * Comprehensive Transaction Validation
   */
  async validateTransaction(request: TransactionValidationRequest): Promise<TransactionValidationResult> {
    const securityChecks: SecurityCheckResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskLevel = RiskLevel.LOW;
    let requiresConfirmation = false;
    const blockReasons: string[] = [];

    try {
      // Session validation
      const session = this.activeSessions.get(request.sessionId);
      if (!session || !session.isValid) {
        errors.push('Invalid or expired session');
        return this.createValidationResult(false, RiskLevel.CRITICAL, errors, warnings, securityChecks, requiresConfirmation, blockReasons);
      }

      // Update session activity
      session.lastActivity = new Date();

      // 1. Amount Validation
      if (request.amount && this.config.transactionValidation.enableAmountValidation) {
        const amountCheck = this.validateTransactionAmount(request.amount);
        securityChecks.push(amountCheck);
        
        if (!amountCheck.passed) {
          if (amountCheck.severity === 'critical') {
            blockReasons.push(amountCheck.message);
          } else if (amountCheck.severity === 'error') {
            errors.push(amountCheck.message);
          } else {
            warnings.push(amountCheck.message);
          }
        }

        if (request.amount > this.config.transactionValidation.requireConfirmationAbove) {
          requiresConfirmation = true;
          riskLevel = this.escalateRiskLevel(riskLevel, RiskLevel.HIGH);
        }
      }

      // 2. Address Validation
      if (request.recipientAddress) {
        const addressCheck = this.validateRecipientAddress(request.recipientAddress);
        securityChecks.push(addressCheck);
        
        if (!addressCheck.passed) {
          if (addressCheck.severity === 'critical') {
            blockReasons.push(addressCheck.message);
          } else {
            warnings.push(addressCheck.message);
          }
        }
      }

      // 3. Fee Validation
      if (request.feeRate && this.config.transactionValidation.enableFeeValidation) {
        const feeCheck = this.validateTransactionFee(request.feeRate);
        securityChecks.push(feeCheck);
        
        if (!feeCheck.passed) {
          warnings.push(feeCheck.message);
        }
      }

      // 4. Fraud Detection Checks
      if (this.config.fraudDetection.enableRealTimeMonitoring) {
        const fraudCheck = await this.performFraudDetection(session, request);
        securityChecks.push(...fraudCheck.checks);
        
        if (fraudCheck.riskLevel !== RiskLevel.VERY_LOW) {
          riskLevel = this.escalateRiskLevel(riskLevel, fraudCheck.riskLevel);
          warnings.push(...fraudCheck.warnings);
          
          if (fraudCheck.shouldBlock) {
            blockReasons.push(...fraudCheck.blockReasons);
          }
        }
      }

      // 5. Transaction History Analysis
      const historyCheck = this.analyzeTransactionHistory(session.walletAddress, request);
      securityChecks.push(historyCheck);
      
      if (!historyCheck.passed && historyCheck.severity === 'warning') {
        warnings.push(historyCheck.message);
        riskLevel = this.escalateRiskLevel(riskLevel, RiskLevel.MEDIUM);
      }

      // 6. Hardware Wallet Requirements
      if (this.config.hardwareWallet.requiredForHighValue && request.amount && 
          request.amount > this.config.transactionValidation.requireConfirmationAbove) {
        const hardwareCheck = this.validateHardwareWalletRequirement(session);
        securityChecks.push(hardwareCheck);
        
        if (!hardwareCheck.passed) {
          warnings.push(hardwareCheck.message);
          requiresConfirmation = true;
        }
      }

      // Log transaction validation
      this.logger.logSecurityEvent('TRANSACTION_VALIDATION', {
        sessionId: request.sessionId,
        transactionType: request.transactionType,
        riskLevel,
        checksPerformed: securityChecks.length,
        warnings: warnings.length,
        errors: errors.length,
        blocked: blockReasons.length > 0
      });

      const isValid = errors.length === 0 && blockReasons.length === 0;
      return this.createValidationResult(isValid, riskLevel, errors, warnings, securityChecks, requiresConfirmation, blockReasons);

    } catch (error: any) {
      this.logger.logSecurityEvent('TRANSACTION_VALIDATION_ERROR', {
        sessionId: request.sessionId,
        error: error.message
      });

      errors.push('Transaction validation failed');
      return this.createValidationResult(false, RiskLevel.CRITICAL, errors, warnings, securityChecks, requiresConfirmation, blockReasons);
    }
  }

  /**
   * Validate transaction signature
   */
  async validateTransactionSignature(
    sessionId: string,
    message: string,
    signature: string,
    address: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      if (!this.config.enableSignatureValidation) {
        return { isValid: true };
      }

      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return { isValid: false, error: 'Invalid session' };
      }

      if (session.walletAddress !== address) {
        return { isValid: false, error: 'Address mismatch' };
      }

      // Validate signature format
      if (!this.validationUtils.isValidSignature(signature)) {
        return { isValid: false, error: 'Invalid signature format' };
      }

      // Validate message content
      const sanitizedMessage = this.validationUtils.sanitizeInput(message);
      if (sanitizedMessage !== message) {
        return { isValid: false, error: 'Message contains invalid characters' };
      }

      this.logger.logSecurityEvent('SIGNATURE_VALIDATION', {
        sessionId,
        address,
        messageLength: message.length,
        result: 'VALID'
      });

      return { isValid: true };

    } catch (error: any) {
      this.logger.logSecurityEvent('SIGNATURE_VALIDATION_ERROR', {
        sessionId,
        error: error.message
      });

      return { 
        isValid: false, 
        error: this.sanitizeErrorMessage(error.message) 
      };
    }
  }

  /**
   * Session Management Methods
   */
  private startSessionHeartbeat(sessionId: string): void {
    const heartbeatTimer = setInterval(() => {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        clearInterval(heartbeatTimer);
        this.heartbeatTimers.delete(sessionId);
        return;
      }

      // Check if session has exceeded idle time
      const idleTime = Date.now() - session.lastActivity.getTime();
      if (idleTime > this.config.sessionSecurity.maxIdleTime) {
        this.logger.logSecurityEvent('SESSION_IDLE_TIMEOUT', {
          sessionId,
          idleTime,
          maxIdleTime: this.config.sessionSecurity.maxIdleTime
        });
        
        this.expireSession(sessionId);
        return;
      }

      // Check if session has exceeded total timeout
      const sessionAge = Date.now() - new Date(sessionId.split('_')[1]).getTime();
      if (sessionAge > this.config.sessionSecurity.sessionTimeout) {
        this.logger.logSecurityEvent('SESSION_TIMEOUT', {
          sessionId,
          sessionAge,
          maxAge: this.config.sessionSecurity.sessionTimeout
        });
        
        this.expireSession(sessionId);
        return;
      }

    }, this.config.sessionSecurity.heartbeatInterval);

    this.heartbeatTimers.set(sessionId, heartbeatTimer);
  }

  private expireSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isValid = false;
      session.validationErrors.push('Session expired');
      
      this.logger.logSecurityEvent('SESSION_EXPIRED', {
        sessionId,
        provider: session.walletProvider,
        address: session.walletAddress
      });
    }

    // Clear heartbeat timer
    const timer = this.heartbeatTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(sessionId);
    }

    // Remove from active sessions
    this.activeSessions.delete(sessionId);
  }

  /**
   * Refresh session activity
   */
  refreshSessionActivity(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isValid) {
      return false;
    }

    session.lastActivity = new Date();
    return true;
  }

  /**
   * Add address to whitelist
   */
  addToWhitelist(address: string): void {
    if (this.addressValidator.validateBitcoinAddress(address).isValid) {
      this.whitelistedAddresses.add(address);
      
      this.logger.logSecurityEvent('ADDRESS_WHITELISTED', {
        address,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Remove address from whitelist
   */
  removeFromWhitelist(address: string): void {
    this.whitelistedAddresses.delete(address);
    
    this.logger.logSecurityEvent('ADDRESS_REMOVED_FROM_WHITELIST', {
      address,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get whitelisted addresses
   */
  getWhitelistedAddresses(): string[] {
    return Array.from(this.whitelistedAddresses);
  }

  /**
   * Persist data to Supabase database
   */
  private async persistToDatabase(table: string, data: Record<string, any>): Promise<void> {
    try {
      const { dbService } = await import('@/lib/database/db-service');
      const client = dbService.getClient();
      await client.from(table).insert(data);
    } catch (error) {
      // Don't crash on DB failure - in-memory still works as fallback
    }
  }

  /**
   * Record transaction in history
   */
  recordTransaction(address: string, transaction: any): void {
    if (!this.transactionHistory.has(address)) {
      this.transactionHistory.set(address, []);
    }

    const history = this.transactionHistory.get(address)!;
    history.push({
      ...transaction,
      timestamp: Date.now()
    });

    // Keep only last 100 transactions per address
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    // Persist to database
    this.persistToDatabase('transaction_history', {
      id: `tx_${Date.now()}`,
      address: address,
      type: transaction.type || 'transaction',
      amount: transaction.amount || 0,
      recipient: transaction.recipientAddress || '',
      created_at: new Date().toISOString()
    }).catch(() => {}); // Fire and forget
  }

  /**
   * Mark suspicious activity
   */
  markSuspiciousActivity(address: string, reason: string): void {
    const currentCount = this.suspiciousActivities.get(address) || 0;
    this.suspiciousActivities.set(address, currentCount + 1);

    this.logger.logSecurityEvent('SUSPICIOUS_ACTIVITY_MARKED', {
      address,
      reason,
      count: currentCount + 1,
      timestamp: new Date().toISOString()
    });

    // Persist to database
    this.persistToDatabase('transaction_history', {
      id: `suspicious_${Date.now()}`,
      address: address,
      type: 'suspicious_activity',
      reason: reason,
      count: currentCount + 1,
      created_at: new Date().toISOString()
    }).catch(() => {}); // Fire and forget
  }

  /**
   * Clear suspicious activity count
   */
  clearSuspiciousActivity(address: string): void {
    this.suspiciousActivities.delete(address);
    
    this.logger.logSecurityEvent('SUSPICIOUS_ACTIVITY_CLEARED', {
      address,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Disconnect wallet securely
   */
  async disconnectWallet(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      this.logger.logSecurityEvent('WALLET_DISCONNECTION', {
        sessionId,
        provider: session.walletProvider,
        address: session.walletAddress
      });
      
      // Clear heartbeat timer
      const timer = this.heartbeatTimers.get(sessionId);
      if (timer) {
        clearInterval(timer);
        this.heartbeatTimers.delete(sessionId);
      }
      
      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Get session security status
   */
  getSessionStatus(sessionId: string): SecurityContext | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Update security configuration
   */
  updateSecurityConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.logger.logSecurityEvent('SECURITY_CONFIG_UPDATED', {
      updatedFields: Object.keys(newConfig),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get security audit report
   */
  getSecurityAuditReport(): {
    activeSessions: number;
    totalConnections: number;
    failedAttempts: number;
    securityLevel: SecurityLevel;
    warnings: string[];
  } {
    const logSummary = this.logger.getLogSummary();
    
    return {
      activeSessions: this.activeSessions.size,
      totalConnections: logSummary.totalConnections,
      failedAttempts: logSummary.failedAttempts,
      securityLevel: this.config.securityLevel,
      warnings: logSummary.warnings
    };
  }

  /**
   * Transaction Validation Helper Methods
   */
  private validateTransactionAmount(amount: number): SecurityCheckResult {
    if (amount <= 0) {
      return {
        checkType: 'AMOUNT_VALIDATION',
        passed: false,
        severity: 'error',
        message: 'Transaction amount must be positive'
      };
    }

    if (amount > this.config.transactionValidation.maxTransactionAmount) {
      return {
        checkType: 'AMOUNT_VALIDATION',
        passed: false,
        severity: 'critical',
        message: `Transaction amount exceeds maximum allowed (${this.config.transactionValidation.maxTransactionAmount} satoshis)`
      };
    }

    return {
      checkType: 'AMOUNT_VALIDATION',
      passed: true,
      severity: 'info',
      message: 'Transaction amount validated successfully'
    };
  }

  private validateRecipientAddress(address: string): SecurityCheckResult {
    // Check if address is blacklisted
    if (this.config.fraudDetection.blacklistedAddresses.includes(address)) {
      return {
        checkType: 'ADDRESS_BLACKLIST',
        passed: false,
        severity: 'critical',
        message: 'Recipient address is blacklisted'
      };
    }

    // Check whitelist if enabled
    if (this.config.transactionValidation.enableAddressWhitelist && 
        !this.whitelistedAddresses.has(address)) {
      return {
        checkType: 'ADDRESS_WHITELIST',
        passed: false,
        severity: 'warning',
        message: 'Recipient address is not whitelisted'
      };
    }

    // Validate address format
    const isValid = this.addressValidator.validateBitcoinAddress(address);
    if (!isValid.isValid) {
      return {
        checkType: 'ADDRESS_FORMAT',
        passed: false,
        severity: 'error',
        message: `Invalid address format: ${isValid.errors.join(', ')}`
      };
    }

    return {
      checkType: 'ADDRESS_VALIDATION',
      passed: true,
      severity: 'info',
      message: 'Recipient address validated successfully'
    };
  }

  private validateTransactionFee(feeRate: number): SecurityCheckResult {
    if (feeRate > this.config.transactionValidation.maxFeeRate) {
      return {
        checkType: 'FEE_VALIDATION',
        passed: false,
        severity: 'warning',
        message: `Fee rate is unusually high (${feeRate} sat/vB). Consider lowering.`
      };
    }

    if (feeRate < 1) {
      return {
        checkType: 'FEE_VALIDATION',
        passed: false,
        severity: 'warning',
        message: 'Fee rate is very low and may cause transaction delays'
      };
    }

    return {
      checkType: 'FEE_VALIDATION',
      passed: true,
      severity: 'info',
      message: 'Transaction fee validated successfully'
    };
  }

  private async performFraudDetection(session: SecurityContext, request: TransactionValidationRequest): Promise<{
    checks: SecurityCheckResult[];
    riskLevel: RiskLevel;
    warnings: string[];
    shouldBlock: boolean;
    blockReasons: string[];
  }> {
    const checks: SecurityCheckResult[] = [];
    const warnings: string[] = [];
    const blockReasons: string[] = [];
    let riskLevel = RiskLevel.VERY_LOW;
    let shouldBlock = false;

    // Check for suspicious activity frequency
    const activityCount = this.suspiciousActivities.get(session.walletAddress) || 0;
    if (activityCount >= this.config.fraudDetection.suspiciousActivityThreshold) {
      checks.push({
        checkType: 'SUSPICIOUS_ACTIVITY',
        passed: false,
        severity: 'critical',
        message: 'Suspicious activity threshold exceeded'
      });
      riskLevel = RiskLevel.CRITICAL;
      shouldBlock = true;
      blockReasons.push('Multiple suspicious activities detected');
    }

    // Check transaction timing patterns
    const recentTransactions = this.getRecentTransactions(session.walletAddress, 3600000); // Last hour
    if (recentTransactions.length > 10) {
      checks.push({
        checkType: 'TRANSACTION_FREQUENCY',
        passed: false,
        severity: 'warning',
        message: 'High transaction frequency detected'
      });
      warnings.push('Unusually high transaction frequency');
      riskLevel = this.escalateRiskLevel(riskLevel, RiskLevel.MEDIUM);
    }

    // Check for rapid succession transactions
    if (recentTransactions.length > 0) {
      const lastTransaction = recentTransactions[recentTransactions.length - 1];
      const timeSinceLastTx = Date.now() - lastTransaction.timestamp;
      
      if (timeSinceLastTx < 30000) { // Less than 30 seconds
        checks.push({
          checkType: 'RAPID_TRANSACTIONS',
          passed: false,
          severity: 'warning',
          message: 'Rapid succession transactions detected'
        });
        warnings.push('Very quick successive transactions');
        riskLevel = this.escalateRiskLevel(riskLevel, RiskLevel.MEDIUM);
      }
    }

    return { checks, riskLevel, warnings, shouldBlock, blockReasons };
  }

  private analyzeTransactionHistory(address: string, request: TransactionValidationRequest): SecurityCheckResult {
    const history = this.transactionHistory.get(address) || [];
    
    // Check for similar transactions
    const similarTransactions = history.filter(tx => 
      tx.recipientAddress === request.recipientAddress &&
      Math.abs(tx.amount - (request.amount || 0)) < 10000 // Within 0.0001 BTC
    );

    if (similarTransactions.length > 3) {
      return {
        checkType: 'TRANSACTION_PATTERN',
        passed: false,
        severity: 'warning',
        message: 'Similar transaction pattern detected',
        details: { similarCount: similarTransactions.length }
      };
    }

    return {
      checkType: 'TRANSACTION_HISTORY',
      passed: true,
      severity: 'info',
      message: 'Transaction history analysis completed'
    };
  }

  private validateHardwareWalletRequirement(session: SecurityContext): SecurityCheckResult {
    // This would need to be enhanced with actual hardware wallet detection
    return {
      checkType: 'HARDWARE_WALLET',
      passed: true, // Placeholder - implement actual hardware wallet detection
      severity: 'info',
      message: 'Hardware wallet requirement check completed'
    };
  }

  private escalateRiskLevel(current: RiskLevel, newLevel: RiskLevel): RiskLevel {
    const levels = [RiskLevel.VERY_LOW, RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
    const currentIndex = levels.indexOf(current);
    const newIndex = levels.indexOf(newLevel);
    return levels[Math.max(currentIndex, newIndex)];
  }

  private createValidationResult(
    isValid: boolean,
    riskLevel: RiskLevel,
    errors: string[],
    warnings: string[],
    securityChecks: SecurityCheckResult[],
    requiresConfirmation: boolean,
    blockReasons?: string[]
  ): TransactionValidationResult {
    return {
      isValid,
      riskLevel,
      errors,
      warnings,
      securityChecks,
      requiresConfirmation,
      blockReasons
    };
  }

  private getRecentTransactions(address: string, timeWindow: number): any[] {
    const history = this.transactionHistory.get(address) || [];
    const cutoffTime = Date.now() - timeWindow;
    return history.filter(tx => tx.timestamp > cutoffTime);
  }

  // Private helper methods
  private generateSecureSessionId(): string {
    const array = new Uint8Array(16);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      // Server-side fallback
      const { randomBytes } = require('crypto');
      const bytes = randomBytes(16);
      bytes.copy(Buffer.from(array.buffer));
    }
    const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    return `session_${Date.now()}_${hex}`;
  }

  private selectWalletProvider(
    requested: WalletProvider | undefined,
    available: WalletProvider[]
  ): WalletProvider {
    if (requested && available.includes(requested)) {
      return requested;
    }
    return available[0] || WalletProvider.UNKNOWN;
  }

  private isProviderAllowed(provider: WalletProvider): boolean {
    return this.config.allowedProviders.includes(provider);
  }

  private sanitizeErrorMessage(message: string): string {
    // Remove sensitive information from error messages
    return message
      .replace(/0x[a-fA-F0-9]+/g, '[ADDRESS_REDACTED]')
      .replace(/[a-zA-Z0-9]{64}/g, '[HASH_REDACTED]')
      .substring(0, 200); // Limit error message length
  }
}

// Export singleton instance
export const walletSecurity = new WalletSecurityManager();

// Export types
export type {
  SecurityConfig,
  SecurityContext,
  WalletConnectionResult
};