/**
 * Payment Gateway System for CYPHER ORDi Future V3
 * Advanced fiat-crypto on/off ramps, KYC compliance, and multi-provider support
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';

// Payment Types
export interface PaymentProvider {
  id: string;
  name: string;
  type: 'bank_transfer' | 'card' | 'digital_wallet' | 'crypto_exchange' | 'p2p';
  supportedCountries: string[];
  supportedCurrencies: string[];
  supportedCryptos: string[];
  fees: FeeStructure;
  limits: TransactionLimits;
  processingTime: ProcessingTime;
  features: {
    instantDeposit: boolean;
    instantWithdrawal: boolean;
    recurringPayments: boolean;
    refunds: boolean;
    chargebacks: boolean;
  };
  kycRequired: boolean;
  isActive: boolean;
  reliability: number; // 0-100
  apiEndpoint: string;
  webhookEndpoint: string;
}

export interface FeeStructure {
  deposit: {
    fixed: number; // USD
    percentage: number; // %
    minimum: number; // USD
    maximum: number; // USD
  };
  withdrawal: {
    fixed: number;
    percentage: number;
    minimum: number;
    maximum: number;
  };
  conversion: {
    spread: number; // %
    fee: number; // %
  };
  cross_border: {
    additional_fee: number; // %
    currency_conversion: number; // %
  };
}

export interface TransactionLimits {
  daily: {
    deposit: number; // USD
    withdrawal: number; // USD
    total: number; // USD
  };
  monthly: {
    deposit: number;
    withdrawal: number;
    total: number;
  };
  perTransaction: {
    minimum: number;
    maximum: number;
  };
  kycTiers: {
    basic: TransactionLimits['daily'];
    standard: TransactionLimits['daily'];
    premium: TransactionLimits['daily'];
  };
}

export interface ProcessingTime {
  deposit: {
    minimum: number; // minutes
    maximum: number; // minutes
    average: number; // minutes
  };
  withdrawal: {
    minimum: number;
    maximum: number;
    average: number;
  };
  byMethod: Record<string, {
    deposit: number;
    withdrawal: number;
  }>;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal';
  method: 'fiat_to_crypto' | 'crypto_to_fiat' | 'crypto_to_crypto';
  provider: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  amounts: {
    fiat: {
      amount: number;
      currency: string;
    };
    crypto: {
      amount: number;
      symbol: string;
      network: string;
    };
    fees: {
      provider: number;
      network: number;
      platform: number;
      total: number;
    };
  };
  exchange: {
    rate: number;
    spread: number;
    slippage: number;
    locked_until: number;
  };
  details: {
    source?: BankAccount | Card | Wallet;
    destination?: BankAccount | Card | Wallet | CryptoAddress;
    reference: string;
    description?: string;
    metadata: Record<string, any>;
  };
  compliance: {
    kycLevel: 'none' | 'basic' | 'standard' | 'premium';
    amlChecked: boolean;
    riskScore: number; // 0-100
    sanctionsChecked: boolean;
    countryRisk: number; // 0-100
    flags: string[];
  };
  timestamps: {
    created: number;
    submitted: number;
    confirmed?: number;
    completed?: number;
    failed?: number;
  };
  tracking: {
    txHash?: string;
    bankReference?: string;
    providerTxId?: string;
    confirmations?: number;
    requiredConfirmations?: number;
  };
}

export interface BankAccount {
  id: string;
  userId: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountType: 'checking' | 'savings';
  currency: string;
  country: string;
  isVerified: boolean;
  verificationMethod: 'micro_deposits' | 'instant_verification' | 'manual';
  addedAt: number;
}

export interface Card {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  brand: 'visa' | 'mastercard' | 'amex' | 'discover';
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  country: string;
  isVerified: boolean;
  addedAt: number;
}

export interface Wallet {
  id: string;
  userId: string;
  type: 'paypal' | 'apple_pay' | 'google_pay' | 'zelle' | 'venmo';
  identifier: string; // email, phone, etc.
  isVerified: boolean;
  addedAt: number;
}

export interface CryptoAddress {
  address: string;
  network: string;
  symbol: string;
  isVerified: boolean;
  label?: string;
}

export interface KYCProfile {
  userId: string;
  level: 'none' | 'basic' | 'standard' | 'premium';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  documents: KYCDocument[];
  verifications: {
    identity: boolean;
    address: boolean;
    phone: boolean;
    email: boolean;
    bank_account: boolean;
    income: boolean;
  };
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    phone: string;
    email: string;
    occupation?: string;
    incomeSource?: string;
    annualIncome?: number;
  };
  riskAssessment: {
    score: number; // 0-100
    factors: string[];
    politically_exposed: boolean;
    sanctions_listed: boolean;
    high_risk_country: boolean;
  };
  approvedAt?: number;
  expiresAt?: number;
  lastReview: number;
}

export interface KYCDocument {
  id: string;
  type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement' | 'proof_of_income';
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: number;
  reviewedAt?: number;
  expiresAt?: number;
  metadata: {
    filename: string;
    size: number;
    hash: string;
  };
}

export interface FiatRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  spread: number;
  timestamp: number;
  source: string;
  validity: number; // seconds
}

export interface PaymentAnalytics {
  userId?: string;
  period: {
    start: number;
    end: number;
  };
  volumes: {
    totalDeposits: number;
    totalWithdrawals: number;
    netFlow: number;
    transactionCount: number;
  };
  fees: {
    totalPaid: number;
    byProvider: Record<string, number>;
    averagePerTransaction: number;
  };
  performance: {
    successRate: number;
    averageProcessingTime: number;
    failureReasons: Record<string, number>;
  };
  compliance: {
    kycCompletionRate: number;
    flaggedTransactions: number;
    averageRiskScore: number;
  };
  trends: {
    dailyVolumes: number[];
    popularMethods: Record<string, number>;
    peakHours: number[];
  };
}

export class PaymentGateway extends EventEmitter {
  private providers: Map<string, PaymentProvider> = new Map();
  private transactions: Map<string, PaymentTransaction> = new Map();
  private userTransactions: Map<string, Set<string>> = new Map();
  private kycProfiles: Map<string, KYCProfile> = new Map();
  private bankAccounts: Map<string, BankAccount[]> = new Map();
  private cards: Map<string, Card[]> = new Map();
  private wallets: Map<string, Wallet[]> = new Map();
  private fiatRates: Map<string, FiatRate> = new Map();

  // Supported currencies and regions
  private readonly SUPPORTED_FIAT = [
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'BRL', 'MXN', 'INR'
  ];

  private readonly SUPPORTED_CRYPTO = [
    'BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'ADA', 'DOT', 'MATIC', 'AVAX', 'LINK'
  ];

  private readonly COMPLIANCE_RULES = {
    aml_threshold: 3000, // USD - requires AML check
    kyc_threshold: 1000, // USD - requires KYC
    high_risk_countries: ['AF', 'IR', 'KP', 'SY'], // ISO country codes
    sanctioned_entities: new Set(['OFAC', 'EU', 'UN']),
    max_daily_unverified: 500, // USD
    max_monthly_unverified: 2000 // USD
  };

  constructor() {
    super();

    EnhancedLogger.info('Payment Gateway initialized', {
      component: 'PaymentGateway',
      supportedFiat: this.SUPPORTED_FIAT.length,
      supportedCrypto: this.SUPPORTED_CRYPTO.length
    });
  }

  /**
   * Initialize payment gateway
   */
  async initialize(): Promise<void> {
    try {
      // Load payment providers
      await this.loadPaymentProviders();

      // Start rate updater
      this.startRateUpdater();

      // Start transaction monitor
      this.startTransactionMonitor();

      // Start compliance checker
      this.startComplianceChecker();

      EnhancedLogger.info('Payment Gateway initialized successfully');
      this.emit('initialized');

    } catch (error) {
      EnhancedLogger.error('Failed to initialize Payment Gateway:', error);
      throw error;
    }
  }

  /**
   * Create deposit transaction
   */
  async createDeposit(
    userId: string,
    fiatAmount: number,
    fiatCurrency: string,
    cryptoSymbol: string,
    providerId: string,
    paymentMethodId?: string
  ): Promise<PaymentTransaction> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`Payment provider ${providerId} not found`);
      }

      // Check KYC requirements
      await this.checkKYCRequirements(userId, fiatAmount, provider);

      // Check transaction limits
      await this.checkTransactionLimits(userId, fiatAmount, 'deposit');

      // Get exchange rate
      const rate = await this.getExchangeRate(fiatCurrency, cryptoSymbol);

      // Calculate fees
      const fees = this.calculateFees(provider, fiatAmount, 'deposit');

      // Calculate crypto amount
      const cryptoAmount = (fiatAmount - fees.total) * rate.rate;

      const transaction: PaymentTransaction = {
        id: this.generateTransactionId(),
        userId,
        type: 'deposit',
        method: 'fiat_to_crypto',
        provider: providerId,
        status: 'pending',
        amounts: {
          fiat: {
            amount: fiatAmount,
            currency: fiatCurrency
          },
          crypto: {
            amount: cryptoAmount,
            symbol: cryptoSymbol,
            network: this.getDefaultNetwork(cryptoSymbol)
          },
          fees
        },
        exchange: {
          rate: rate.rate,
          spread: rate.spread,
          slippage: 0.1, // 0.1% estimated slippage
          locked_until: Date.now() + 300000 // 5 minutes
        },
        details: {
          reference: this.generateReference(),
          metadata: {}
        },
        compliance: await this.performComplianceCheck(userId, fiatAmount, fiatCurrency),
        timestamps: {
          created: Date.now(),
          submitted: Date.now()
        },
        tracking: {}
      };

      // Store transaction
      this.transactions.set(transaction.id, transaction);

      // Add to user transactions
      if (!this.userTransactions.has(userId)) {
        this.userTransactions.set(userId, new Set());
      }
      this.userTransactions.get(userId)!.add(transaction.id);

      // Process transaction with provider
      await this.processWithProvider(transaction);

      EnhancedLogger.info('Deposit transaction created', {
        transactionId: transaction.id,
        userId,
        fiatAmount,
        fiatCurrency,
        cryptoAmount,
        cryptoSymbol,
        providerId
      });

      this.emit('transactionCreated', transaction);
      return transaction;

    } catch (error) {
      EnhancedLogger.error('Failed to create deposit:', error);
      throw error;
    }
  }

  /**
   * Create withdrawal transaction
   */
  async createWithdrawal(
    userId: string,
    cryptoAmount: number,
    cryptoSymbol: string,
    fiatCurrency: string,
    providerId: string,
    paymentMethodId: string
  ): Promise<PaymentTransaction> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`Payment provider ${providerId} not found`);
      }

      // Get exchange rate
      const rate = await this.getExchangeRate(cryptoSymbol, fiatCurrency);

      // Calculate fiat amount
      const fiatAmount = cryptoAmount * rate.rate;

      // Check KYC requirements
      await this.checkKYCRequirements(userId, fiatAmount, provider);

      // Check transaction limits
      await this.checkTransactionLimits(userId, fiatAmount, 'withdrawal');

      // Calculate fees
      const fees = this.calculateFees(provider, fiatAmount, 'withdrawal');

      // Net amount user receives
      const netFiatAmount = fiatAmount - fees.total;

      const transaction: PaymentTransaction = {
        id: this.generateTransactionId(),
        userId,
        type: 'withdrawal',
        method: 'crypto_to_fiat',
        provider: providerId,
        status: 'pending',
        amounts: {
          fiat: {
            amount: netFiatAmount,
            currency: fiatCurrency
          },
          crypto: {
            amount: cryptoAmount,
            symbol: cryptoSymbol,
            network: this.getDefaultNetwork(cryptoSymbol)
          },
          fees
        },
        exchange: {
          rate: rate.rate,
          spread: rate.spread,
          slippage: 0.1,
          locked_until: Date.now() + 300000
        },
        details: {
          reference: this.generateReference(),
          metadata: { paymentMethodId }
        },
        compliance: await this.performComplianceCheck(userId, fiatAmount, fiatCurrency),
        timestamps: {
          created: Date.now(),
          submitted: Date.now()
        },
        tracking: {}
      };

      this.transactions.set(transaction.id, transaction);

      if (!this.userTransactions.has(userId)) {
        this.userTransactions.set(userId, new Set());
      }
      this.userTransactions.get(userId)!.add(transaction.id);

      await this.processWithProvider(transaction);

      EnhancedLogger.info('Withdrawal transaction created', {
        transactionId: transaction.id,
        userId,
        cryptoAmount,
        cryptoSymbol,
        netFiatAmount,
        fiatCurrency,
        providerId
      });

      this.emit('transactionCreated', transaction);
      return transaction;

    } catch (error) {
      EnhancedLogger.error('Failed to create withdrawal:', error);
      throw error;
    }
  }

  /**
   * Complete KYC verification
   */
  async submitKYC(
    userId: string,
    level: 'basic' | 'standard' | 'premium',
    personalInfo: KYCProfile['personalInfo'],
    documents: Omit<KYCDocument, 'id' | 'uploadedAt' | 'status'>[]
  ): Promise<KYCProfile> {
    try {
      const profile: KYCProfile = {
        userId,
        level,
        status: 'pending',
        documents: documents.map(doc => ({
          ...doc,
          id: this.generateDocumentId(),
          uploadedAt: Date.now(),
          status: 'pending'
        })),
        verifications: {
          identity: false,
          address: false,
          phone: false,
          email: false,
          bank_account: false,
          income: false
        },
        personalInfo,
        riskAssessment: await this.assessRisk(personalInfo),
        lastReview: Date.now()
      };

      // Perform automated checks
      await this.performAutomatedKYCChecks(profile);

      this.kycProfiles.set(userId, profile);

      EnhancedLogger.info('KYC submission received', {
        userId,
        level,
        riskScore: profile.riskAssessment.score
      });

      this.emit('kycSubmitted', profile);
      return profile;

    } catch (error) {
      EnhancedLogger.error('Failed to submit KYC:', error);
      throw error;
    }
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(
    userId: string,
    type: 'bank' | 'card' | 'wallet',
    details: any
  ): Promise<string> {
    try {
      let methodId: string;

      switch (type) {
        case 'bank':
          methodId = await this.addBankAccount(userId, details);
          break;
        case 'card':
          methodId = await this.addCard(userId, details);
          break;
        case 'wallet':
          methodId = await this.addWallet(userId, details);
          break;
        default:
          throw new Error(`Unsupported payment method type: ${type}`);
      }

      EnhancedLogger.info('Payment method added', { userId, type, methodId });
      this.emit('paymentMethodAdded', { userId, type, methodId });

      return methodId;

    } catch (error) {
      EnhancedLogger.error('Failed to add payment method:', error);
      throw error;
    }
  }

  /**
   * Get user transactions
   */
  getUserTransactions(
    userId: string,
    filters?: {
      type?: 'deposit' | 'withdrawal';
      status?: PaymentTransaction['status'];
      provider?: string;
      limit?: number;
    }
  ): PaymentTransaction[] {
    const transactionIds = this.userTransactions.get(userId) || new Set();
    let transactions = Array.from(transactionIds)
      .map(id => this.transactions.get(id))
      .filter((tx): tx is PaymentTransaction => tx !== undefined);

    // Apply filters
    if (filters) {
      if (filters.type) {
        transactions = transactions.filter(tx => tx.type === filters.type);
      }
      if (filters.status) {
        transactions = transactions.filter(tx => tx.status === filters.status);
      }
      if (filters.provider) {
        transactions = transactions.filter(tx => tx.provider === filters.provider);
      }
    }

    // Sort by creation time (newest first) and limit
    transactions.sort((a, b) => b.timestamps.created - a.timestamps.created);
    
    if (filters?.limit) {
      transactions = transactions.slice(0, filters.limit);
    }

    return transactions;
  }

  /**
   * Get payment analytics
   */
  getPaymentAnalytics(
    userId?: string,
    startDate?: number,
    endDate?: number
  ): PaymentAnalytics {
    const start = startDate || Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    const end = endDate || Date.now();

    const allTransactions = userId
      ? this.getUserTransactions(userId)
      : Array.from(this.transactions.values());

    const periodTransactions = allTransactions.filter(tx =>
      tx.timestamps.created >= start && tx.timestamps.created <= end
    );

    const completedTx = periodTransactions.filter(tx => tx.status === 'completed');
    const deposits = completedTx.filter(tx => tx.type === 'deposit');
    const withdrawals = completedTx.filter(tx => tx.type === 'withdrawal');

    const totalDeposits = deposits.reduce((sum, tx) => sum + tx.amounts.fiat.amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, tx) => sum + tx.amounts.fiat.amount, 0);

    return {
      userId,
      period: { start, end },
      volumes: {
        totalDeposits,
        totalWithdrawals,
        netFlow: totalDeposits - totalWithdrawals,
        transactionCount: periodTransactions.length
      },
      fees: {
        totalPaid: completedTx.reduce((sum, tx) => sum + tx.amounts.fees.total, 0),
        byProvider: this.calculateFeesByProvider(completedTx),
        averagePerTransaction: completedTx.length > 0 ? 
          completedTx.reduce((sum, tx) => sum + tx.amounts.fees.total, 0) / completedTx.length : 0
      },
      performance: {
        successRate: periodTransactions.length > 0 ? 
          (completedTx.length / periodTransactions.length) * 100 : 0,
        averageProcessingTime: this.calculateAverageProcessingTime(completedTx),
        failureReasons: this.calculateFailureReasons(periodTransactions)
      },
      compliance: {
        kycCompletionRate: this.calculateKYCCompletionRate(),
        flaggedTransactions: periodTransactions.filter(tx => 
          tx.compliance.flags.length > 0
        ).length,
        averageRiskScore: periodTransactions.reduce((sum, tx) => 
          sum + tx.compliance.riskScore, 0) / periodTransactions.length
      },
      trends: {
        dailyVolumes: this.calculateDailyVolumes(periodTransactions, start, end),
        popularMethods: this.calculatePopularMethods(periodTransactions),
        peakHours: this.calculatePeakHours(periodTransactions)
      }
    };
  }

  /**
   * Private methods
   */

  private async loadPaymentProviders(): Promise<void> {
    const mockProviders: PaymentProvider[] = [
      {
        id: 'stripe',
        name: 'Stripe',
        type: 'card',
        supportedCountries: ['US', 'CA', 'GB', 'EU'],
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD'],
        supportedCryptos: ['BTC', 'ETH', 'USDT', 'USDC'],
        fees: {
          deposit: { fixed: 0, percentage: 2.9, minimum: 0.5, maximum: 100 },
          withdrawal: { fixed: 0, percentage: 2.9, minimum: 0.5, maximum: 100 },
          conversion: { spread: 0.5, fee: 0.1 },
          cross_border: { additional_fee: 1.5, currency_conversion: 1.0 }
        },
        limits: {
          daily: { deposit: 50000, withdrawal: 50000, total: 100000 },
          monthly: { deposit: 1000000, withdrawal: 1000000, total: 2000000 },
          perTransaction: { minimum: 1, maximum: 50000 },
          kycTiers: {
            basic: { deposit: 1000, withdrawal: 1000, total: 2000 },
            standard: { deposit: 10000, withdrawal: 10000, total: 20000 },
            premium: { deposit: 50000, withdrawal: 50000, total: 100000 }
          }
        },
        processingTime: {
          deposit: { minimum: 1, maximum: 5, average: 2 },
          withdrawal: { minimum: 60, maximum: 180, average: 120 },
          byMethod: {
            'credit_card': { deposit: 1, withdrawal: 120 },
            'debit_card': { deposit: 1, withdrawal: 120 }
          }
        },
        features: {
          instantDeposit: true,
          instantWithdrawal: false,
          recurringPayments: true,
          refunds: true,
          chargebacks: true
        },
        kycRequired: true,
        isActive: true,
        reliability: 99,
        apiEndpoint: 'https://api.stripe.com/v1',
        webhookEndpoint: 'https://api.cypher.com/webhooks/stripe'
      },
      {
        id: 'plaid',
        name: 'Plaid',
        type: 'bank_transfer',
        supportedCountries: ['US', 'CA'],
        supportedCurrencies: ['USD', 'CAD'],
        supportedCryptos: ['BTC', 'ETH', 'USDT', 'USDC'],
        fees: {
          deposit: { fixed: 0, percentage: 0.5, minimum: 0, maximum: 50 },
          withdrawal: { fixed: 0, percentage: 0.5, minimum: 0, maximum: 50 },
          conversion: { spread: 0.3, fee: 0.05 },
          cross_border: { additional_fee: 0, currency_conversion: 0.5 }
        },
        limits: {
          daily: { deposit: 100000, withdrawal: 100000, total: 200000 },
          monthly: { deposit: 2000000, withdrawal: 2000000, total: 4000000 },
          perTransaction: { minimum: 10, maximum: 100000 },
          kycTiers: {
            basic: { deposit: 5000, withdrawal: 5000, total: 10000 },
            standard: { deposit: 25000, withdrawal: 25000, total: 50000 },
            premium: { deposit: 100000, withdrawal: 100000, total: 200000 }
          }
        },
        processingTime: {
          deposit: { minimum: 60, maximum: 300, average: 180 },
          withdrawal: { minimum: 180, maximum: 1440, average: 720 },
          byMethod: {
            'ach': { deposit: 180, withdrawal: 720 },
            'wire': { deposit: 60, withdrawal: 180 }
          }
        },
        features: {
          instantDeposit: false,
          instantWithdrawal: false,
          recurringPayments: true,
          refunds: true,
          chargebacks: false
        },
        kycRequired: true,
        isActive: true,
        reliability: 97,
        apiEndpoint: 'https://api.plaid.com',
        webhookEndpoint: 'https://api.cypher.com/webhooks/plaid'
      }
    ];

    for (const provider of mockProviders) {
      this.providers.set(provider.id, provider);
    }

    EnhancedLogger.info('Payment providers loaded', { count: mockProviders.length });
  }

  private async checkKYCRequirements(userId: string, amount: number, provider: PaymentProvider): Promise<void> {
    if (!provider.kycRequired) return;

    const profile = this.kycProfiles.get(userId);
    
    if (amount >= this.COMPLIANCE_RULES.kyc_threshold) {
      if (!profile || profile.status !== 'approved') {
        throw new Error('KYC verification required for this transaction amount');
      }

      // Check if KYC level supports this amount
      const limits = (provider.limits.kycTiers as any)[profile.level];
      if (amount > limits.total) {
        throw new Error(`Transaction amount exceeds limit for KYC level: ${profile.level}`);
      }
    }
  }

  private async checkTransactionLimits(userId: string, amount: number, type: 'deposit' | 'withdrawal'): Promise<void> {
    // Get user's transactions for the day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const todayTransactions = this.getUserTransactions(userId).filter(tx =>
      tx.timestamps.created >= todayStart && tx.status === 'completed'
    );

    const todayVolume = todayTransactions
      .filter(tx => tx.type === type)
      .reduce((sum, tx) => sum + tx.amounts.fiat.amount, 0);

    // Check daily limit (using basic tier as default)
    const dailyLimit = type === 'deposit' ? 5000 : 5000; // Mock limits
    
    if (todayVolume + amount > dailyLimit) {
      throw new Error(`Daily ${type} limit exceeded. Limit: $${dailyLimit}, Current: $${todayVolume}`);
    }
  }

  private async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<FiatRate> {
    const rateKey = `${fromCurrency}-${toCurrency}`;
    const cached = this.fiatRates.get(rateKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached;
    }

    // Mock exchange rates
    const mockRates: Record<string, number> = {
      'USD-BTC': 0.000023, // $45,000 per BTC
      'USD-ETH': 0.00033, // $3,000 per ETH
      'USD-USDT': 1.0,
      'USD-USDC': 1.0,
      'BTC-USD': 45000,
      'ETH-USD': 3000,
      'USDT-USD': 1.0,
      'USDC-USD': 1.0
    };

    const rate: FiatRate = {
      fromCurrency,
      toCurrency,
      rate: mockRates[rateKey] || 1,
      spread: 0.5, // 0.5% spread
      timestamp: Date.now(),
      source: 'mock_provider',
      validity: 300 // 5 minutes
    };

    this.fiatRates.set(rateKey, rate);
    return rate;
  }

  private calculateFees(provider: PaymentProvider, amount: number, type: 'deposit' | 'withdrawal'): PaymentTransaction['amounts']['fees'] {
    const feeStructure = provider.fees[type];
    
    const percentageFee = amount * (feeStructure.percentage / 100);
    const providerFee = Math.max(feeStructure.minimum, Math.min(feeStructure.maximum, feeStructure.fixed + percentageFee));
    const networkFee = 5; // Mock network fee
    const platformFee = amount * 0.001; // 0.1% platform fee

    return {
      provider: providerFee,
      network: networkFee,
      platform: platformFee,
      total: providerFee + networkFee + platformFee
    };
  }

  private async performComplianceCheck(userId: string, amount: number, currency: string): Promise<PaymentTransaction['compliance']> {
    const profile = this.kycProfiles.get(userId);
    
    return {
      kycLevel: profile?.level || 'none',
      amlChecked: amount >= this.COMPLIANCE_RULES.aml_threshold,
      riskScore: this.calculateRiskScore(userId, amount),
      sanctionsChecked: true,
      countryRisk: 10, // Mock country risk
      flags: []
    };
  }

  private calculateRiskScore(userId: string, amount: number): number {
    // Mock risk scoring
    let score = 20; // Base score

    // Amount risk
    if (amount > 10000) score += 20;
    else if (amount > 5000) score += 10;

    // User history risk
    const userTxs = this.getUserTransactions(userId);
    if (userTxs.length === 0) score += 15; // New user

    return Math.min(100, score);
  }

  private async processWithProvider(transaction: PaymentTransaction): Promise<void> {
    // Mock provider processing
    transaction.status = 'processing';
    transaction.timestamps.confirmed = Date.now();

    // Simulate processing delay
    setTimeout(() => {
      transaction.status = 'completed';
      transaction.timestamps.completed = Date.now();
      transaction.tracking.providerTxId = this.generateProviderTxId();
      
      this.transactions.set(transaction.id, transaction);
      this.emit('transactionCompleted', transaction);
    }, 5000); // 5 second delay
  }

  private async assessRisk(personalInfo: KYCProfile['personalInfo']): Promise<KYCProfile['riskAssessment']> {
    let score = 10; // Base score
    const factors: string[] = [];

    // Country risk
    if (this.COMPLIANCE_RULES.high_risk_countries.includes(personalInfo.address.country)) {
      score += 30;
      factors.push('high_risk_country');
    }

    // Age risk
    const age = new Date().getFullYear() - new Date(personalInfo.dateOfBirth).getFullYear();
    if (age < 21) {
      score += 10;
      factors.push('young_age');
    }

    return {
      score: Math.min(100, score),
      factors,
      politically_exposed: false, // Mock
      sanctions_listed: false, // Mock
      high_risk_country: this.COMPLIANCE_RULES.high_risk_countries.includes(personalInfo.address.country)
    };
  }

  private async performAutomatedKYCChecks(profile: KYCProfile): Promise<void> {
    // Mock automated checks
    profile.verifications.email = true;
    profile.verifications.phone = true;
    
    // Simulate document review
    setTimeout(() => {
      profile.status = 'approved';
      profile.approvedAt = Date.now();
      profile.expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year
      
      this.kycProfiles.set(profile.userId, profile);
      this.emit('kycApproved', profile);
    }, 10000); // 10 second delay
  }

  private async addBankAccount(userId: string, details: any): Promise<string> {
    const account: BankAccount = {
      id: this.generatePaymentMethodId(),
      userId,
      bankName: details.bankName,
      accountNumber: details.accountNumber,
      routingNumber: details.routingNumber,
      accountType: details.accountType,
      currency: details.currency,
      country: details.country,
      isVerified: false,
      verificationMethod: 'micro_deposits',
      addedAt: Date.now()
    };

    if (!this.bankAccounts.has(userId)) {
      this.bankAccounts.set(userId, []);
    }
    this.bankAccounts.get(userId)!.push(account);

    return account.id;
  }

  private async addCard(userId: string, details: any): Promise<string> {
    const card: Card = {
      id: this.generatePaymentMethodId(),
      userId,
      type: details.type,
      brand: details.brand,
      last4: details.number.slice(-4),
      expiryMonth: details.expiryMonth,
      expiryYear: details.expiryYear,
      country: details.country,
      isVerified: true,
      addedAt: Date.now()
    };

    if (!this.cards.has(userId)) {
      this.cards.set(userId, []);
    }
    this.cards.get(userId)!.push(card);

    return card.id;
  }

  private async addWallet(userId: string, details: any): Promise<string> {
    const wallet: Wallet = {
      id: this.generatePaymentMethodId(),
      userId,
      type: details.type,
      identifier: details.identifier,
      isVerified: false,
      addedAt: Date.now()
    };

    if (!this.wallets.has(userId)) {
      this.wallets.set(userId, []);
    }
    this.wallets.get(userId)!.push(wallet);

    return wallet.id;
  }

  private getDefaultNetwork(cryptoSymbol: string): string {
    const networks: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'ethereum',
      'USDC': 'ethereum',
      'SOL': 'solana'
    };
    return networks[cryptoSymbol] || 'ethereum';
  }

  private calculateFeesByProvider(transactions: PaymentTransaction[]): Record<string, number> {
    const feesByProvider: Record<string, number> = {};
    
    for (const tx of transactions) {
      feesByProvider[tx.provider] = (feesByProvider[tx.provider] || 0) + tx.amounts.fees.total;
    }
    
    return feesByProvider;
  }

  private calculateAverageProcessingTime(transactions: PaymentTransaction[]): number {
    const completedTx = transactions.filter(tx => tx.timestamps.completed);
    if (completedTx.length === 0) return 0;

    const totalTime = completedTx.reduce((sum, tx) => 
      sum + (tx.timestamps.completed! - tx.timestamps.created), 0
    );
    
    return totalTime / completedTx.length / 1000 / 60; // Convert to minutes
  }

  private calculateFailureReasons(transactions: PaymentTransaction[]): Record<string, number> {
    const reasons: Record<string, number> = {};
    
    transactions
      .filter(tx => tx.status === 'failed')
      .forEach(tx => {
        const reason = 'provider_error'; // Mock reason
        reasons[reason] = (reasons[reason] || 0) + 1;
      });
    
    return reasons;
  }

  private calculateKYCCompletionRate(): number {
    const totalProfiles = this.kycProfiles.size;
    const approvedProfiles = Array.from(this.kycProfiles.values())
      .filter(p => p.status === 'approved').length;
    
    return totalProfiles > 0 ? (approvedProfiles / totalProfiles) * 100 : 0;
  }

  private calculateDailyVolumes(transactions: PaymentTransaction[], start: number, end: number): number[] {
    const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
    const volumes = new Array(days).fill(0);
    
    for (const tx of transactions) {
      const dayIndex = Math.floor((tx.timestamps.created - start) / (24 * 60 * 60 * 1000));
      if (dayIndex >= 0 && dayIndex < days) {
        volumes[dayIndex] += tx.amounts.fiat.amount;
      }
    }
    
    return volumes;
  }

  private calculatePopularMethods(transactions: PaymentTransaction[]): Record<string, number> {
    const methods: Record<string, number> = {};
    
    for (const tx of transactions) {
      methods[tx.provider] = (methods[tx.provider] || 0) + 1;
    }
    
    return methods;
  }

  private calculatePeakHours(transactions: PaymentTransaction[]): number[] {
    const hours = new Array(24).fill(0);
    
    for (const tx of transactions) {
      const hour = new Date(tx.timestamps.created).getHours();
      hours[hour]++;
    }
    
    return hours;
  }

  private startRateUpdater(): void {
    setInterval(() => {
      this.updateExchangeRates();
    }, 60 * 1000); // Update every minute
  }

  private startTransactionMonitor(): void {
    setInterval(() => {
      this.monitorTransactions();
    }, 30 * 1000); // Monitor every 30 seconds
  }

  private startComplianceChecker(): void {
    setInterval(() => {
      this.runComplianceChecks();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private updateExchangeRates(): void {
    // Clear old rates to force refresh
    this.fiatRates.clear();
  }

  private monitorTransactions(): void {
    // Monitor for stuck or failed transactions
    const now = Date.now();
    for (const transaction of this.transactions.values()) {
      if (transaction.status === 'processing' && 
          now - transaction.timestamps.submitted > 30 * 60 * 1000) { // 30 minutes
        EnhancedLogger.warn('Transaction timeout detected', {
          transactionId: transaction.id,
          userId: transaction.userId
        });
      }
    }
  }

  private runComplianceChecks(): void {
    // Run periodic compliance checks
    this.emit('complianceCheckCompleted');
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReference(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePaymentMethodId(): string {
    return `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateProviderTxId(): string {
    return `prov_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }
}

// Singleton instance
export const paymentGateway = new PaymentGateway();

// Export utility functions
export const PaymentUtils = {
  /**
   * Validate payment method details
   */
  validatePaymentMethod(type: string, details: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (type) {
      case 'card':
        if (!details.number || details.number.length < 15) errors.push('Invalid card number');
        if (!details.expiryMonth || details.expiryMonth < 1 || details.expiryMonth > 12) errors.push('Invalid expiry month');
        if (!details.expiryYear || details.expiryYear < new Date().getFullYear()) errors.push('Invalid expiry year');
        if (!details.cvv || details.cvv.length < 3) errors.push('Invalid CVV');
        break;
      case 'bank':
        if (!details.accountNumber) errors.push('Account number required');
        if (!details.routingNumber) errors.push('Routing number required');
        if (!details.bankName) errors.push('Bank name required');
        break;
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Calculate exchange rate with spread
   */
  calculateRateWithSpread(baseRate: number, spread: number): { buy: number; sell: number } {
    const spreadAmount = baseRate * (spread / 100);
    return {
      buy: baseRate + spreadAmount,
      sell: baseRate - spreadAmount
    };
  },

  /**
   * Format transaction amount
   */
  formatAmount(amount: number, currency: string): string {
    const cryptoCurrencies = ['BTC', 'ETH', 'USDT', 'USDC'];
    
    if (cryptoCurrencies.includes(currency)) {
      return `${amount.toFixed(8)} ${currency}`;
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount);
    }
  },

  /**
   * Calculate optimal payment route
   */
  calculateOptimalRoute(
    providers: PaymentProvider[],
    amount: number,
    currency: string,
    priority: 'cost' | 'speed' | 'reliability'
  ): PaymentProvider | null {
    const eligibleProviders = providers.filter(p => 
      p.isActive && 
      p.supportedCurrencies.includes(currency) &&
      amount >= p.limits.perTransaction.minimum &&
      amount <= p.limits.perTransaction.maximum
    );

    if (eligibleProviders.length === 0) return null;

    switch (priority) {
      case 'cost':
        return eligibleProviders.reduce((best, current) => 
          (current.fees.deposit.percentage + current.fees.deposit.fixed / amount) <
          (best.fees.deposit.percentage + best.fees.deposit.fixed / amount) ? current : best
        );
      case 'speed':
        return eligibleProviders.reduce((best, current) => 
          current.processingTime.deposit.average < best.processingTime.deposit.average ? current : best
        );
      case 'reliability':
        return eligibleProviders.reduce((best, current) => 
          current.reliability > best.reliability ? current : best
        );
      default:
        return eligibleProviders[0];
    }
  }
};