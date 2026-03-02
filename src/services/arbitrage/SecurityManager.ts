import crypto from 'crypto';
import { ArbitrageOpportunity } from './ArbitrageEngine';
import { logger } from './utils/logger';

export interface SecurityConfig {
  enableSignatureValidation: boolean;
  enableIPWhitelisting: boolean;
  enableAPIKeyRotation: boolean;
  enable2FA: boolean;
  maxAPICallsPerMinute: number;
  encryptionKey: string;
}

export interface APICredentials {
  exchange: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  sandbox: boolean;
  createdAt: number;
  lastUsed: number;
  isActive: boolean;
}

export interface SecurityAlert {
  id: string;
  type: 'SUSPICIOUS_ACTIVITY' | 'FAILED_AUTHENTICATION' | 'RATE_LIMIT_EXCEEDED' | 'UNAUTHORIZED_ACCESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: number;
  metadata: any;
}

export class SecurityManager {
  private config: SecurityConfig;
  private credentials: Map<string, APICredentials> = new Map();
  private encryptionKey: Buffer;
  private rateLimitTracker: Map<string, number[]> = new Map();
  private whitelistedIPs: Set<string> = new Set();
  private securityAlerts: SecurityAlert[] = [];
  private suspiciousActivities: Map<string, number> = new Map();
  private lastKeyRotation: Map<string, number> = new Map();
  
  constructor() {
    this.config = this.initializeSecurityConfig();
    this.encryptionKey = this.generateEncryptionKey();
    this.setupIPWhitelist();
  }

  private initializeSecurityConfig(): SecurityConfig {
    return {
      enableSignatureValidation: true,
      enableIPWhitelisting: process.env.NODE_ENV === 'production',
      enableAPIKeyRotation: true,
      enable2FA: true,
      maxAPICallsPerMinute: 1000,
      encryptionKey: process.env.SECURITY_ENCRYPTION_KEY || this.generateRandomKey()
    };
  }

  private generateEncryptionKey(): Buffer {
    if (this.config.encryptionKey) {
      return Buffer.from(this.config.encryptionKey, 'hex');
    }
    return crypto.randomBytes(32);
  }

  private generateRandomKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private setupIPWhitelist(): void {
    // Add common localhost addresses for development
    this.whitelistedIPs.add('127.0.0.1');
    this.whitelistedIPs.add('::1');
    this.whitelistedIPs.add('localhost');
    
    // Add production IPs from environment
    const prodIPs = process.env.WHITELISTED_IPS?.split(',') || [];
    prodIPs.forEach(ip => this.whitelistedIPs.add(ip.trim()));
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Security Manager...');
      
      // Load stored credentials
      await this.loadStoredCredentials();
      
      // Validate existing credentials
      await this.validateAllCredentials();
      
      // Setup automatic key rotation
      if (this.config.enableAPIKeyRotation) {
        this.setupKeyRotationSchedule();
      }
      
      logger.info('Security Manager initialized successfully');
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to initialize Security Manager:');
      throw error;
    }
  }

  async addCredentials(exchange: string, apiKey: string, apiSecret: string, passphrase?: string): Promise<void> {
    try {
      // Encrypt sensitive data
      const encryptedSecret = this.encrypt(apiSecret);
      const encryptedPassphrase = passphrase ? this.encrypt(passphrase) : undefined;
      
      const credentials: APICredentials = {
        exchange,
        apiKey, // API keys are typically not secret
        apiSecret: encryptedSecret,
        passphrase: encryptedPassphrase,
        sandbox: process.env.NODE_ENV !== 'production',
        createdAt: Date.now(),
        lastUsed: 0,
        isActive: true
      };
      
      this.credentials.set(exchange, credentials);
      
      // Validate the credentials
      const isValid = await this.validateCredentials(exchange);
      if (!isValid) {
        this.credentials.delete(exchange);
        throw new Error(`Invalid credentials for exchange: ${exchange}`);
      }
      
      logger.info(`Added and validated credentials for exchange: ${exchange}`);
      
    } catch (error) {
      logger.error(`Failed to add credentials for ${exchange}:`, error);
      throw error;
    }
  }

  async getCredentials(exchange: string): Promise<APICredentials | null> {
    try {
      const credentials = this.credentials.get(exchange);
      if (!credentials || !credentials.isActive) {
        return null;
      }
      
      // Decrypt sensitive data
      const decryptedCredentials = {
        ...credentials,
        apiSecret: this.decrypt(credentials.apiSecret),
        passphrase: credentials.passphrase ? this.decrypt(credentials.passphrase) : undefined
      };
      
      // Update last used timestamp
      credentials.lastUsed = Date.now();
      
      return decryptedCredentials;
      
    } catch (error) {
      logger.error(`Failed to get credentials for ${exchange}:`, error);
      return null;
    }
  }

  generateSignature(exchange: string, method: string, path: string, body: string = '', timestamp?: string): string {
    try {
      const credentials = this.credentials.get(exchange);
      if (!credentials) {
        throw new Error(`No credentials found for exchange: ${exchange}`);
      }
      
      const secret = this.decrypt(credentials.apiSecret);
      const ts = timestamp || Date.now().toString();
      
      // Different exchanges use different signature methods
      switch (exchange.toLowerCase()) {
        case 'binance':
          return this.generateBinanceSignature(secret, body);
        case 'coinbase':
          return this.generateCoinbaseSignature(secret, ts, method, path, body);
        case 'kraken':
          return this.generateKrakenSignature(secret, path, body, ts);
        case 'okx':
          return this.generateOKXSignature(secret, ts, method, path, body);
        default:
          throw new Error(`Unsupported exchange for signature generation: ${exchange}`);
      }
      
    } catch (error) {
      logger.error(`Failed to generate signature for ${exchange}:`, error);
      throw error;
    }
  }

  private generateBinanceSignature(secret: string, queryString: string): string {
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
  }

  private generateCoinbaseSignature(secret: string, timestamp: string, method: string, path: string, body: string): string {
    const message = timestamp + method.toUpperCase() + path + body;
    return crypto.createHmac('sha256', Buffer.from(secret, 'base64')).update(message).digest('base64');
  }

  private generateKrakenSignature(secret: string, path: string, postData: string, nonce: string): string {
    const message = path + crypto.createHash('sha256').update(nonce + postData).digest();
    return crypto.createHmac('sha512', Buffer.from(secret, 'base64')).update(message).digest('base64');
  }

  private generateOKXSignature(secret: string, timestamp: string, method: string, path: string, body: string): string {
    const message = timestamp + method.toUpperCase() + path + body;
    return crypto.createHmac('sha256', secret).update(message).digest('base64');
  }

  async validateExecution(opportunity: ArbitrageOpportunity): Promise<boolean> {
    try {
      // Rate limiting check
      if (!this.checkRateLimit(opportunity.buyExchange) || 
          !this.checkRateLimit(opportunity.sellExchange)) {
        this.createSecurityAlert('RATE_LIMIT_EXCEEDED', 'HIGH', 
          `Rate limit exceeded for opportunity: ${opportunity.id}`);
        return false;
      }
      
      // Validate opportunity integrity
      if (!this.validateOpportunityIntegrity(opportunity)) {
        this.createSecurityAlert('SUSPICIOUS_ACTIVITY', 'HIGH', 
          `Invalid opportunity detected: ${opportunity.id}`);
        return false;
      }
      
      // Check for suspicious patterns
      if (this.detectSuspiciousActivity(opportunity)) {
        this.createSecurityAlert('SUSPICIOUS_ACTIVITY', 'MEDIUM', 
          `Suspicious activity pattern detected for opportunity: ${opportunity.id}`);
        return false;
      }
      
      // Validate credentials are still active
      const buyCredentials = await this.getCredentials(opportunity.buyExchange);
      const sellCredentials = await this.getCredentials(opportunity.sellExchange);
      
      if (!buyCredentials || !sellCredentials) {
        this.createSecurityAlert('FAILED_AUTHENTICATION', 'HIGH', 
          `Missing credentials for opportunity: ${opportunity.id}`);
        return false;
      }
      
      return true;
      
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Security validation failed:');
      this.createSecurityAlert('SUSPICIOUS_ACTIVITY', 'CRITICAL', 
        `Security validation error: ${error.message}`);
      return false;
    }
  }

  private validateOpportunityIntegrity(opportunity: ArbitrageOpportunity): boolean {
    // Check for realistic values
    if (opportunity.spread <= 0 || opportunity.spreadPercentage <= 0) {
      return false;
    }
    
    if (opportunity.buyPrice <= 0 || opportunity.sellPrice <= 0) {
      return false;
    }
    
    if (opportunity.volume <= 0 || opportunity.estimatedProfit <= 0) {
      return false;
    }
    
    // Check for extremely unrealistic spreads (possible data manipulation)
    if (opportunity.spreadPercentage > 50) { // 50% spread is extremely unrealistic
      return false;
    }
    
    // Timestamp should be recent
    const ageInMinutes = (Date.now() - opportunity.timestamp) / (1000 * 60);
    if (ageInMinutes > 5) { // Opportunity is too old
      return false;
    }
    
    return true;
  }

  private detectSuspiciousActivity(opportunity: ArbitrageOpportunity): boolean {
    const key = `${opportunity.buyExchange}_${opportunity.sellExchange}_${opportunity.pair}`;
    const count = this.suspiciousActivities.get(key) || 0;
    
    // Increment activity counter
    this.suspiciousActivities.set(key, count + 1);
    
    // Clean old entries (older than 1 hour)
    setTimeout(() => {
      this.suspiciousActivities.delete(key);
    }, 60 * 60 * 1000);
    
    // Flag as suspicious if too many opportunities from same exchanges/pair
    return count > 100; // More than 100 opportunities per hour is suspicious
  }

  private checkRateLimit(exchange: string): boolean {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${exchange}_${minute}`;
    
    if (!this.rateLimitTracker.has(key)) {
      this.rateLimitTracker.set(key, []);
    }
    
    const calls = this.rateLimitTracker.get(key)!;
    calls.push(now);
    
    // Clean up old minutes
    const oldKeys = Array.from(this.rateLimitTracker.keys()).filter(k => {
      const keyMinute = parseInt(k.split('_')[1]);
      return minute - keyMinute > 5; // Keep last 5 minutes
    });
    oldKeys.forEach(key => this.rateLimitTracker.delete(key));
    
    return calls.length <= this.config.maxAPICallsPerMinute;
  }

  private async loadStoredCredentials(): Promise<void> {
    // In a real implementation, this would load from secure storage
    // For now, we'll load from environment variables
    
    const exchanges = ['binance', 'coinbase', 'kraken', 'okx'];
    
    for (const exchange of exchanges) {
      const apiKey = process.env[`${exchange.toUpperCase()}_API_KEY`];
      const apiSecret = process.env[`${exchange.toUpperCase()}_API_SECRET`];
      const passphrase = process.env[`${exchange.toUpperCase()}_PASSPHRASE`];
      
      if (apiKey && apiSecret) {
        try {
          await this.addCredentials(exchange, apiKey, apiSecret, passphrase);
        } catch (error) {
          logger.warn(`Failed to load credentials for ${exchange}:`, error);
        }
      }
    }
  }

  private async validateAllCredentials(): Promise<void> {
    const validationPromises = Array.from(this.credentials.keys()).map(
      exchange => this.validateCredentials(exchange)
    );
    
    await Promise.all(validationPromises);
  }

  private async validateCredentials(exchange: string): Promise<boolean> {
    try {
      // This would make a test API call to validate credentials
      // For now, we'll assume they are valid if they exist
      const credentials = this.credentials.get(exchange);
      return credentials !== undefined;
      
    } catch (error) {
      logger.error(`Credential validation failed for ${exchange}:`, error);
      return false;
    }
  }

  private setupKeyRotationSchedule(): void {
    // Rotate keys every 30 days
    setInterval(() => {
      this.rotateAPIKeys();
    }, 30 * 24 * 60 * 60 * 1000);
  }

  private async rotateAPIKeys(): Promise<void> {
    logger.info('Starting API key rotation...');
    
    for (const [exchange, credentials] of this.credentials) {
      const lastRotation = this.lastKeyRotation.get(exchange) || 0;
      const daysSinceRotation = (Date.now() - lastRotation) / (24 * 60 * 60 * 1000);
      
      if (daysSinceRotation >= 30) {
        try {
          // In a real implementation, this would generate new API keys
          // and update them with the exchange
          logger.info(`Rotating API keys for ${exchange}`);
          this.lastKeyRotation.set(exchange, Date.now());
          
        } catch (error) {
          logger.error(`Failed to rotate keys for ${exchange}:`, error);
          this.createSecurityAlert('FAILED_AUTHENTICATION', 'HIGH', 
            `Key rotation failed for ${exchange}`);
        }
      }
    }
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.slice(0, 32)), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encrypted = textParts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.slice(0, 32)), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private createSecurityAlert(
    type: SecurityAlert['type'], 
    severity: SecurityAlert['severity'], 
    message: string, 
    metadata?: any
  ): void {
    const alert: SecurityAlert = {
      id: crypto.randomUUID(),
      type,
      severity,
      message,
      timestamp: Date.now(),
      metadata
    };
    
    this.securityAlerts.push(alert);
    
    // Keep only last 1000 alerts
    if (this.securityAlerts.length > 1000) {
      this.securityAlerts.shift();
    }
    
    logger.warn(`Security Alert [${severity}]: ${message}`);
    
    // Log alert for external handling
    logger.warn(`Security Alert Emitted: ${alert.type} - ${alert.message}`);
  }

  // Public methods
  getSecurityAlerts(severity?: SecurityAlert['severity']): SecurityAlert[] {
    if (severity) {
      return this.securityAlerts.filter(alert => alert.severity === severity);
    }
    return [...this.securityAlerts];
  }

  clearSecurityAlerts(): void {
    this.securityAlerts.length = 0;
  }

  addWhitelistedIP(ip: string): void {
    this.whitelistedIPs.add(ip);
    logger.info(`Added IP to whitelist: ${ip}`);
  }

  removeWhitelistedIP(ip: string): void {
    this.whitelistedIPs.delete(ip);
    logger.info(`Removed IP from whitelist: ${ip}`);
  }

  isIPWhitelisted(ip: string): boolean {
    return !this.config.enableIPWhitelisting || this.whitelistedIPs.has(ip);
  }

  getSecurityStatus(): any {
    return {
      config: this.config,
      activeCredentials: Array.from(this.credentials.keys()),
      whitelistedIPs: Array.from(this.whitelistedIPs),
      recentAlerts: this.securityAlerts.slice(-10),
      rateLimitStatus: Object.fromEntries(this.rateLimitTracker)
    };
  }

  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Security configuration updated');
  }
}

export default SecurityManager;