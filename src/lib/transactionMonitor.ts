/**
 * Transaction Monitoring and Alert System
 * Real-time monitoring for suspicious activities and automated alerts
 * 
 * @version 1.0.0
 * @author CYPHER ORDI FUTURE - Enhanced Security Module
 */

import { SecurityLogger, SecurityEventType, LogLevel } from './securityLogs';
import { RiskLevel, TransactionType } from './walletSecurity';
import { ValidationUtils } from '../utils/validation';

export interface TransactionAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: AlertType;
  title: string;
  description: string;
  timestamp: Date;
  address: string;
  transactionId?: string;
  amount?: number;
  riskScore: number;
  actionRequired: boolean;
  suggestions: string[];
  metadata: Record<string, any>;
}

export enum AlertType {
  SUSPICIOUS_AMOUNT = 'SUSPICIOUS_AMOUNT',
  RAPID_TRANSACTIONS = 'RAPID_TRANSACTIONS',
  BLACKLISTED_ADDRESS = 'BLACKLISTED_ADDRESS',
  UNUSUAL_PATTERN = 'UNUSUAL_PATTERN',
  HIGH_RISK_RECIPIENT = 'HIGH_RISK_RECIPIENT',
  POSSIBLE_FRAUD = 'POSSIBLE_FRAUD',
  SECURITY_BREACH = 'SECURITY_BREACH',
  ANOMALOUS_BEHAVIOR = 'ANOMALOUS_BEHAVIOR',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  TECHNICAL_ANOMALY = 'TECHNICAL_ANOMALY'
}

export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: RuleCondition[];
  actions: RuleAction[];
  cooldown?: number; // Minimum time between alerts in ms
  lastTriggered?: Date;
}

export interface RuleCondition {
  type: 'amount' | 'frequency' | 'address' | 'pattern' | 'time' | 'custom';
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'in' | 'not_in' | 'matches' | 'custom';
  value: any;
  timeWindow?: number; // Time window in ms for frequency checks
}

export interface RuleAction {
  type: 'alert' | 'block' | 'log' | 'notify' | 'custom';
  parameters: Record<string, any>;
}

export interface TransactionRecord {
  id: string;
  address: string;
  amount: number;
  recipientAddress: string;
  timestamp: Date;
  type: TransactionType;
  status: 'pending' | 'confirmed' | 'failed';
  riskScore: number;
  flags: string[];
  metadata: Record<string, any>;
}

export interface MonitoringStats {
  totalTransactions: number;
  totalAlerts: number;
  alertsBySeverity: Record<string, number>;
  alertsByType: Record<string, number>;
  riskDistribution: Record<string, number>;
  timeRange: { start: Date; end: Date };
  topRiskyAddresses: Array<{ address: string; riskScore: number; alertCount: number }>;
}

export class TransactionMonitor {
  private logger: SecurityLogger;
  private validationUtils: ValidationUtils;
  private transactions: Map<string, TransactionRecord[]> = new Map();
  private alerts: TransactionAlert[] = [];
  private rules: MonitoringRule[] = [];
  private blacklistedAddresses: Set<string> = new Set();
  private whitelistedAddresses: Set<string> = new Set();
  private addressRiskScores: Map<string, number> = new Map();
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.logger = new SecurityLogger();
    this.validationUtils = new ValidationUtils();
    this.initializeDefaultRules();
    this.loadKnownRiskAddresses();
  }

  /**
   * Start transaction monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.logger.logSecurityEvent(
      SecurityEventType.SYSTEM_ERROR, // Using existing enum, would add MONITORING_STARTED
      { action: 'Transaction monitoring started' },
      LogLevel.INFO
    );

    // Start periodic checks
    this.monitoringInterval = setInterval(() => {
      this.performPeriodicChecks();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop transaction monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.logger.logSecurityEvent(
      SecurityEventType.SYSTEM_ERROR, // Using existing enum
      { action: 'Transaction monitoring stopped' },
      LogLevel.INFO
    );
  }

  /**
   * Record a new transaction for monitoring
   */
  recordTransaction(transaction: Omit<TransactionRecord, 'id' | 'timestamp' | 'riskScore' | 'flags'>): string {
    const record: TransactionRecord = {
      ...transaction,
      id: this.generateTransactionId(),
      timestamp: new Date(),
      riskScore: this.calculateRiskScore(transaction),
      flags: this.analyzeTransactionFlags(transaction)
    };

    // Add to transaction history
    const addressHistory = this.transactions.get(transaction.address) || [];
    addressHistory.push(record);
    this.transactions.set(transaction.address, addressHistory);

    // Keep only last 1000 transactions per address
    if (addressHistory.length > 1000) {
      addressHistory.splice(0, addressHistory.length - 1000);
    }

    // Check rules immediately
    this.checkRulesForTransaction(record);

    this.logger.logSecurityEvent(
      SecurityEventType.TRANSACTION_VALIDATION,
      {
        transactionId: record.id,
        address: record.address,
        amount: record.amount,
        riskScore: record.riskScore,
        flags: record.flags
      },
      LogLevel.INFO
    );

    return record.id;
  }

  /**
   * Add monitoring rule
   */
  addRule(rule: Omit<MonitoringRule, 'id'>): string {
    const ruleWithId: MonitoringRule = {
      ...rule,
      id: this.generateRuleId()
    };

    this.rules.push(ruleWithId);
    
    this.logger.logSecurityEvent(
      SecurityEventType.SECURITY_CONFIG_UPDATED,
      { action: 'Monitoring rule added', ruleId: ruleWithId.id, ruleName: rule.name },
      LogLevel.INFO
    );

    return ruleWithId.id;
  }

  /**
   * Remove monitoring rule
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index === -1) return false;

    const removedRule = this.rules.splice(index, 1)[0];
    
    this.logger.logSecurityEvent(
      SecurityEventType.SECURITY_CONFIG_UPDATED,
      { action: 'Monitoring rule removed', ruleId, ruleName: removedRule.name },
      LogLevel.INFO
    );

    return true;
  }

  /**
   * Get all alerts with optional filtering
   */
  getAlerts(filter?: {
    severity?: string;
    type?: AlertType;
    address?: string;
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }): TransactionAlert[] {
    let filteredAlerts = [...this.alerts];

    if (filter) {
      if (filter.severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === filter.severity);
      }

      if (filter.type) {
        filteredAlerts = filteredAlerts.filter(alert => alert.type === filter.type);
      }

      if (filter.address) {
        filteredAlerts = filteredAlerts.filter(alert => alert.address === filter.address);
      }

      if (filter.timeRange) {
        filteredAlerts = filteredAlerts.filter(alert =>
          alert.timestamp >= filter.timeRange!.start &&
          alert.timestamp <= filter.timeRange!.end
        );
      }

      if (filter.limit) {
        filteredAlerts = filteredAlerts.slice(-filter.limit);
      }
    }

    return filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(timeRange?: { start: Date; end: Date }): MonitoringStats {
    const relevantTransactions = this.getTransactionsInRange(timeRange);
    const relevantAlerts = timeRange ? 
      this.alerts.filter(alert => 
        alert.timestamp >= timeRange.start && 
        alert.timestamp <= timeRange.end
      ) : this.alerts;

    const alertsBySeverity: Record<string, number> = {};
    const alertsByType: Record<string, number> = {};
    const riskDistribution: Record<string, number> = {};
    const addressRisks: Map<string, { riskScore: number; alertCount: number }> = new Map();

    relevantAlerts.forEach(alert => {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;

      const existing = addressRisks.get(alert.address) || { riskScore: 0, alertCount: 0 };
      existing.alertCount++;
      existing.riskScore = Math.max(existing.riskScore, alert.riskScore);
      addressRisks.set(alert.address, existing);
    });

    relevantTransactions.forEach(tx => {
      const riskLevel = this.getRiskLevel(tx.riskScore);
      riskDistribution[riskLevel] = (riskDistribution[riskLevel] || 0) + 1;
    });

    const topRiskyAddresses = Array.from(addressRisks.entries())
      .map(([address, data]) => ({ address, ...data }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    return {
      totalTransactions: relevantTransactions.length,
      totalAlerts: relevantAlerts.length,
      alertsBySeverity,
      alertsByType,
      riskDistribution,
      timeRange: timeRange || {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      },
      topRiskyAddresses
    };
  }

  /**
   * Add address to blacklist
   */
  addToBlacklist(address: string, reason?: string): void {
    this.blacklistedAddresses.add(address);
    this.addressRiskScores.set(address, 100); // Maximum risk

    this.logger.logSecurityEvent(
      SecurityEventType.ADDRESS_VALIDATION,
      { action: 'Address blacklisted', address, reason },
      LogLevel.WARNING
    );
  }

  /**
   * Remove address from blacklist
   */
  removeFromBlacklist(address: string): void {
    this.blacklistedAddresses.delete(address);
    this.addressRiskScores.delete(address);

    this.logger.logSecurityEvent(
      SecurityEventType.ADDRESS_VALIDATION,
      { action: 'Address removed from blacklist', address },
      LogLevel.INFO
    );
  }

  /**
   * Add address to whitelist
   */
  addToWhitelist(address: string): void {
    this.whitelistedAddresses.add(address);
    this.addressRiskScores.set(address, 0); // Minimum risk

    this.logger.logSecurityEvent(
      SecurityEventType.ADDRESS_VALIDATION,
      { action: 'Address whitelisted', address },
      LogLevel.INFO
    );
  }

  /**
   * Clear alert
   */
  clearAlert(alertId: string): boolean {
    const index = this.alerts.findIndex(alert => alert.id === alertId);
    if (index === -1) return false;

    this.alerts.splice(index, 1);
    return true;
  }

  // Private methods
  private initializeDefaultRules(): void {
    // High amount transaction rule
    this.rules.push({
      id: 'high_amount_tx',
      name: 'High Amount Transaction',
      description: 'Alert for transactions above 1 BTC',
      enabled: true,
      severity: 'high',
      conditions: [
        {
          type: 'amount',
          operator: 'gt',
          value: 100000000 // 1 BTC in satoshis
        }
      ],
      actions: [
        {
          type: 'alert',
          parameters: { 
            title: 'High Value Transaction Detected',
            description: 'Transaction amount exceeds 1 BTC threshold'
          }
        }
      ]
    });

    // Rapid transaction rule
    this.rules.push({
      id: 'rapid_transactions',
      name: 'Rapid Transactions',
      description: 'Alert for more than 5 transactions in 10 minutes',
      enabled: true,
      severity: 'medium',
      conditions: [
        {
          type: 'frequency',
          operator: 'gt',
          value: 5,
          timeWindow: 600000 // 10 minutes
        }
      ],
      actions: [
        {
          type: 'alert',
          parameters: {
            title: 'Rapid Transaction Pattern',
            description: 'Multiple transactions detected in short time period'
          }
        }
      ]
    });

    // Blacklisted address rule
    this.rules.push({
      id: 'blacklisted_address',
      name: 'Blacklisted Address',
      description: 'Alert for transactions to blacklisted addresses',
      enabled: true,
      severity: 'critical',
      conditions: [
        {
          type: 'address',
          operator: 'in',
          value: 'blacklist'
        }
      ],
      actions: [
        {
          type: 'alert',
          parameters: {
            title: 'Blacklisted Address Detected',
            description: 'Transaction involves a blacklisted address'
          }
        },
        {
          type: 'block',
          parameters: { reason: 'Blacklisted address' }
        }
      ]
    });
  }

  private loadKnownRiskAddresses(): void {
    // In a real implementation, this would load from a threat intelligence feed
    // For now, adding some example high-risk patterns
    const knownRiskPatterns = [
      // Add known high-risk address patterns here
    ];

    knownRiskPatterns.forEach(address => {
      this.addressRiskScores.set(address, 80);
    });
  }

  private calculateRiskScore(transaction: Omit<TransactionRecord, 'id' | 'timestamp' | 'riskScore' | 'flags'>): number {
    let riskScore = 0;

    // Amount-based risk
    if (transaction.amount > 100000000) { // > 1 BTC
      riskScore += 30;
    } else if (transaction.amount > 10000000) { // > 0.1 BTC
      riskScore += 15;
    }

    // Address-based risk
    const addressRisk = this.addressRiskScores.get(transaction.recipientAddress) || 0;
    riskScore += addressRisk * 0.5;

    // Blacklist check
    if (this.blacklistedAddresses.has(transaction.recipientAddress)) {
      riskScore += 100;
    }

    // Whitelist bonus
    if (this.whitelistedAddresses.has(transaction.recipientAddress)) {
      riskScore = Math.max(0, riskScore - 50);
    }

    // Transaction history analysis
    const history = this.transactions.get(transaction.address) || [];
    const recentTransactions = history.filter(tx => 
      Date.now() - tx.timestamp.getTime() < 3600000 // Last hour
    );

    if (recentTransactions.length > 10) {
      riskScore += 25;
    } else if (recentTransactions.length > 5) {
      riskScore += 10;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  private analyzeTransactionFlags(transaction: Omit<TransactionRecord, 'id' | 'timestamp' | 'riskScore' | 'flags'>): string[] {
    const flags: string[] = [];

    if (transaction.amount > 100000000) {
      flags.push('HIGH_AMOUNT');
    }

    if (this.blacklistedAddresses.has(transaction.recipientAddress)) {
      flags.push('BLACKLISTED_RECIPIENT');
    }

    const history = this.transactions.get(transaction.address) || [];
    const recentTransactions = history.filter(tx => 
      Date.now() - tx.timestamp.getTime() < 600000 // Last 10 minutes
    );

    if (recentTransactions.length > 5) {
      flags.push('RAPID_TRANSACTIONS');
    }

    // Check for unusual patterns
    const sameDayTransactions = history.filter(tx =>
      tx.timestamp.toDateString() === new Date().toDateString()
    );

    if (sameDayTransactions.length > 20) {
      flags.push('UNUSUAL_ACTIVITY');
    }

    return flags;
  }

  private checkRulesForTransaction(transaction: TransactionRecord): void {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.cooldown && rule.lastTriggered) {
        const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
        if (timeSinceLastTrigger < rule.cooldown) continue;
      }

      if (this.evaluateRuleConditions(rule.conditions, transaction)) {
        this.triggerRule(rule, transaction);
        rule.lastTriggered = new Date();
      }
    }
  }

  private evaluateRuleConditions(conditions: RuleCondition[], transaction: TransactionRecord): boolean {
    return conditions.every(condition => this.evaluateCondition(condition, transaction));
  }

  private evaluateCondition(condition: RuleCondition, transaction: TransactionRecord): boolean {
    switch (condition.type) {
      case 'amount':
        return this.compareValues(transaction.amount, condition.operator, condition.value);
      
      case 'frequency':
        const history = this.transactions.get(transaction.address) || [];
        const timeWindow = condition.timeWindow || 3600000; // Default 1 hour
        const recentTxs = history.filter(tx => 
          Date.now() - tx.timestamp.getTime() < timeWindow
        );
        return this.compareValues(recentTxs.length, condition.operator, condition.value);
      
      case 'address':
        if (condition.value === 'blacklist') {
          return this.blacklistedAddresses.has(transaction.recipientAddress);
        }
        return this.compareValues(transaction.recipientAddress, condition.operator, condition.value);
      
      default:
        return false;
    }
  }

  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'gt': return actual > expected;
      case 'lt': return actual < expected;
      case 'eq': return actual === expected;
      case 'ne': return actual !== expected;
      case 'in': return Array.isArray(expected) ? expected.includes(actual) : false;
      case 'not_in': return Array.isArray(expected) ? !expected.includes(actual) : true;
      default: return false;
    }
  }

  private triggerRule(rule: MonitoringRule, transaction: TransactionRecord): void {
    for (const action of rule.actions) {
      this.executeRuleAction(action, rule, transaction);
    }
  }

  private executeRuleAction(action: RuleAction, rule: MonitoringRule, transaction: TransactionRecord): void {
    switch (action.type) {
      case 'alert':
        this.createAlert(rule, transaction, action.parameters);
        break;
      
      case 'log':
        this.logger.logSecurityEvent(
          SecurityEventType.SUSPICIOUS_ACTIVITY,
          {
            ruleId: rule.id,
            ruleName: rule.name,
            transactionId: transaction.id,
            address: transaction.address,
            ...action.parameters
          },
          LogLevel.WARNING
        );
        break;
      
      case 'block':
        // In a real implementation, this would block the transaction
        this.logger.logSecurityEvent(
          SecurityEventType.FRAUD_ATTEMPT_BLOCKED,
          {
            ruleId: rule.id,
            transactionId: transaction.id,
            reason: action.parameters.reason || 'Rule violation'
          },
          LogLevel.ERROR
        );
        break;
    }
  }

  private createAlert(rule: MonitoringRule, transaction: TransactionRecord, parameters: any): void {
    const alert: TransactionAlert = {
      id: this.generateAlertId(),
      severity: rule.severity,
      type: this.getAlertType(rule.name),
      title: parameters.title || `Rule Triggered: ${rule.name}`,
      description: parameters.description || rule.description,
      timestamp: new Date(),
      address: transaction.address,
      transactionId: transaction.id,
      amount: transaction.amount,
      riskScore: transaction.riskScore,
      actionRequired: rule.severity === 'high' || rule.severity === 'critical',
      suggestions: this.generateSuggestions(rule, transaction),
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        transactionFlags: transaction.flags
      }
    };

    this.alerts.push(alert);

    // Keep only last 10000 alerts
    if (this.alerts.length > 10000) {
      this.alerts.splice(0, this.alerts.length - 10000);
    }

    this.logger.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      {
        alertId: alert.id,
        severity: alert.severity,
        type: alert.type,
        address: alert.address,
        riskScore: alert.riskScore
      },
      rule.severity === 'critical' ? LogLevel.CRITICAL : LogLevel.WARNING
    );
  }

  private performPeriodicChecks(): void {
    // Cleanup old transactions
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    for (const [address, transactions] of this.transactions) {
      const filteredTransactions = transactions.filter(tx => 
        tx.timestamp.getTime() > cutoffTime
      );
      if (filteredTransactions.length === 0) {
        this.transactions.delete(address);
      } else {
        this.transactions.set(address, filteredTransactions);
      }
    }

    // Cleanup old alerts
    this.alerts = this.alerts.filter(alert => 
      Date.now() - alert.timestamp.getTime() < 30 * 24 * 60 * 60 * 1000 // 30 days
    );
  }

  private getTransactionsInRange(timeRange?: { start: Date; end: Date }): TransactionRecord[] {
    const allTransactions: TransactionRecord[] = [];
    
    for (const transactions of this.transactions.values()) {
      allTransactions.push(...transactions);
    }

    if (!timeRange) return allTransactions;

    return allTransactions.filter(tx =>
      tx.timestamp >= timeRange.start && tx.timestamp <= timeRange.end
    );
  }

  private getRiskLevel(riskScore: number): string {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    if (riskScore >= 20) return 'low';
    return 'very_low';
  }

  private getAlertType(ruleName: string): AlertType {
    const nameUpper = ruleName.toUpperCase();
    
    if (nameUpper.includes('AMOUNT')) return AlertType.SUSPICIOUS_AMOUNT;
    if (nameUpper.includes('RAPID') || nameUpper.includes('FREQUENCY')) return AlertType.RAPID_TRANSACTIONS;
    if (nameUpper.includes('BLACKLIST')) return AlertType.BLACKLISTED_ADDRESS;
    if (nameUpper.includes('PATTERN')) return AlertType.UNUSUAL_PATTERN;
    
    return AlertType.ANOMALOUS_BEHAVIOR;
  }

  private generateSuggestions(rule: MonitoringRule, transaction: TransactionRecord): string[] {
    const suggestions: string[] = [];

    if (rule.severity === 'critical') {
      suggestions.push('Immediate review required');
      suggestions.push('Consider blocking transaction');
    }

    if (transaction.riskScore > 80) {
      suggestions.push('High risk transaction - verify recipient');
      suggestions.push('Contact user for confirmation');
    }

    if (this.blacklistedAddresses.has(transaction.recipientAddress)) {
      suggestions.push('Recipient address is blacklisted');
      suggestions.push('Block transaction immediately');
    }

    if (suggestions.length === 0) {
      suggestions.push('Monitor for additional suspicious activity');
      suggestions.push('Review transaction details');
    }

    return suggestions;
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const transactionMonitor = new TransactionMonitor();