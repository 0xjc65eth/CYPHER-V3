/**
 * 📊 CYPHER REVENUE TRACKING SYSTEM
 * Sistema de tracking e auditoria de revenue
 * Monitora, analisa e reporta todas as taxas coletadas
 */

import { NetworkType, Transaction, CalculatedFee } from './feeManager';
import { FeeDistribution, DistributionTransaction } from './feeDistribution';

// Interface para entrada de revenue
export interface RevenueEntry {
  id: string;
  transactionId: string;
  network: NetworkType;
  amount: number;
  amountUSD: number;
  feePercentage: number;
  userAddress: string;
  platform?: string;
  timestamp: Date;
  status: 'pending' | 'collected' | 'distributed' | 'failed';
  txHash?: string;
  distributionTxHash?: string;
}

// Interface para estatísticas de revenue
export interface RevenueStats {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  revenueGrowth: number; // Percentage growth
  topNetworks: Array<{
    network: NetworkType;
    revenue: number;
    transactions: number;
    percentage: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    transactions: number;
  }>;
  lastUpdated: Date;
}

// Interface para relatório de auditoria
export interface AuditReport {
  reportId: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    totalDistributed: number;
    pendingDistribution: number;
    networkBreakdown: Record<NetworkType, {
      revenue: number;
      transactions: number;
      distributed: number;
      pending: number;
    }>;
  };
  discrepancies: Array<{
    type: 'missing_collection' | 'failed_distribution' | 'amount_mismatch';
    description: string;
    transactionId: string;
    amount: number;
    timestamp: Date;
  }>;
  generatedAt: Date;
}

/**
 * Classe principal do sistema de tracking de revenue
 */
export class CypherRevenueTracker {
  private static instance: CypherRevenueTracker;
  private revenueEntries: Map<string, RevenueEntry>;
  private distributionHistory: Map<string, DistributionTransaction>;

  private constructor() {
    this.revenueEntries = new Map();
    this.distributionHistory = new Map();
  }

  public static getInstance(): CypherRevenueTracker {
    if (!CypherRevenueTracker.instance) {
      CypherRevenueTracker.instance = new CypherRevenueTracker();
    }
    return CypherRevenueTracker.instance;
  }

  /**
   * Registra uma nova entrada de revenue
   */
  public async recordRevenue(
    transaction: Transaction,
    calculatedFee: CalculatedFee,
    txHash?: string
  ): Promise<RevenueEntry> {
    const entry: RevenueEntry = {
      id: `rev_${Date.now()}_${transaction.id}`,
      transactionId: transaction.id,
      network: transaction.network,
      amount: calculatedFee.feeAmount,
      amountUSD: calculatedFee.feeAmountUSD,
      feePercentage: calculatedFee.feePercentage,
      userAddress: transaction.userAddress,
      platform: transaction.platform,
      timestamp: transaction.timestamp,
      status: txHash ? 'collected' : 'pending',
      txHash
    };

    this.revenueEntries.set(entry.id, entry);

    return entry;
  }

  /**
   * Atualiza status de uma entrada de revenue
   */
  public updateRevenueStatus(
    entryId: string,
    status: RevenueEntry['status'],
    txHash?: string,
    distributionTxHash?: string
  ): void {
    const entry = this.revenueEntries.get(entryId);
    
    if (!entry) {
      console.error(`❌ Revenue entry ${entryId} not found`);
      return;
    }

    entry.status = status;
    if (txHash) entry.txHash = txHash;
    if (distributionTxHash) entry.distributionTxHash = distributionTxHash;

    this.revenueEntries.set(entryId, entry);
  }

  /**
   * Registra uma distribuição no histórico
   */
  public recordDistribution(distribution: DistributionTransaction): void {
    this.distributionHistory.set(distribution.id, distribution);

    // Atualiza status das entradas relacionadas
    this.updateRelatedRevenueEntries(distribution);
  }

  /**
   * Atualiza entradas de revenue relacionadas a uma distribuição
   */
  private updateRelatedRevenueEntries(distribution: DistributionTransaction): void {
    const relatedEntries = Array.from(this.revenueEntries.values())
      .filter(entry => 
        entry.network === distribution.network && 
        entry.status === 'collected'
      );

    relatedEntries.forEach(entry => {
      entry.status = 'distributed';
      entry.distributionTxHash = distribution.txHash;
      this.revenueEntries.set(entry.id, entry);
    });
  }

  /**
   * Gera estatísticas completas de revenue
   */
  public generateStats(period?: { start: Date; end: Date }): RevenueStats {
    const entries = Array.from(this.revenueEntries.values());
    const filteredEntries = period 
      ? entries.filter(entry => 
          entry.timestamp >= period.start && entry.timestamp <= period.end
        )
      : entries;

    const totalRevenue = filteredEntries.reduce((sum, entry) => sum + entry.amountUSD, 0);
    const totalTransactions = filteredEntries.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Calcular crescimento (comparar com período anterior)
    const revenueGrowth = this.calculateGrowth(filteredEntries, period);

    // Top networks
    const networkRevenue = new Map<NetworkType, { revenue: number; transactions: number }>();
    filteredEntries.forEach(entry => {
      const current = networkRevenue.get(entry.network) || { revenue: 0, transactions: 0 };
      current.revenue += entry.amountUSD;
      current.transactions += 1;
      networkRevenue.set(entry.network, current);
    });

    const topNetworks = Array.from(networkRevenue.entries())
      .map(([network, data]) => ({
        network,
        revenue: data.revenue,
        transactions: data.transactions,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Revenue diário
    const dailyRevenue = this.generateDailyRevenue(filteredEntries);

    // Revenue mensal
    const monthlyRevenue = this.generateMonthlyRevenue(filteredEntries);

    return {
      totalRevenue,
      totalTransactions,
      averageTransactionValue,
      revenueGrowth,
      topNetworks,
      dailyRevenue,
      monthlyRevenue,
      lastUpdated: new Date()
    };
  }

  /**
   * Calcula crescimento de revenue
   */
  private calculateGrowth(entries: RevenueEntry[], period?: { start: Date; end: Date }): number {
    if (!period) return 0;

    const periodLength = period.end.getTime() - period.start.getTime();
    const previousPeriodStart = new Date(period.start.getTime() - periodLength);
    const previousPeriodEnd = period.start;

    const previousEntries = Array.from(this.revenueEntries.values())
      .filter(entry => 
        entry.timestamp >= previousPeriodStart && entry.timestamp < previousPeriodEnd
      );

    const currentRevenue = entries.reduce((sum, entry) => sum + entry.amountUSD, 0);
    const previousRevenue = previousEntries.reduce((sum, entry) => sum + entry.amountUSD, 0);

    if (previousRevenue === 0) return currentRevenue > 0 ? 100 : 0;
    
    return ((currentRevenue - previousRevenue) / previousRevenue) * 100;
  }

  /**
   * Gera dados de revenue diário
   */
  private generateDailyRevenue(entries: RevenueEntry[]): Array<{ date: string; revenue: number; transactions: number }> {
    const dailyData = new Map<string, { revenue: number; transactions: number }>();

    entries.forEach(entry => {
      const dateKey = entry.timestamp.toISOString().split('T')[0];
      const current = dailyData.get(dateKey) || { revenue: 0, transactions: 0 };
      current.revenue += entry.amountUSD;
      current.transactions += 1;
      dailyData.set(dateKey, current);
    });

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Gera dados de revenue mensal
   */
  private generateMonthlyRevenue(entries: RevenueEntry[]): Array<{ month: string; revenue: number; transactions: number }> {
    const monthlyData = new Map<string, { revenue: number; transactions: number }>();

    entries.forEach(entry => {
      const monthKey = `${entry.timestamp.getFullYear()}-${String(entry.timestamp.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyData.get(monthKey) || { revenue: 0, transactions: 0 };
      current.revenue += entry.amountUSD;
      current.transactions += 1;
      monthlyData.set(monthKey, current);
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Gera relatório de auditoria
   */
  public generateAuditReport(period: { start: Date; end: Date }): AuditReport {
    const entries = Array.from(this.revenueEntries.values())
      .filter(entry => entry.timestamp >= period.start && entry.timestamp <= period.end);

    const distributions = Array.from(this.distributionHistory.values())
      .filter(dist => dist.timestamp >= period.start && dist.timestamp <= period.end);

    const totalRevenue = entries.reduce((sum, entry) => sum + entry.amountUSD, 0);
    const totalTransactions = entries.length;
    const totalDistributed = distributions
      .filter(dist => dist.status === 'confirmed')
      .reduce((sum, dist) => sum + dist.amount, 0);
    const pendingDistribution = entries
      .filter(entry => entry.status === 'collected')
      .reduce((sum, entry) => sum + entry.amountUSD, 0);

    // Network breakdown
    const networkBreakdown: Record<string, any> = {};
    entries.forEach(entry => {
      if (!networkBreakdown[entry.network]) {
        networkBreakdown[entry.network] = {
          revenue: 0,
          transactions: 0,
          distributed: 0,
          pending: 0
        };
      }
      networkBreakdown[entry.network].revenue += entry.amountUSD;
      networkBreakdown[entry.network].transactions += 1;
      
      if (entry.status === 'distributed') {
        networkBreakdown[entry.network].distributed += entry.amountUSD;
      } else if (entry.status === 'collected') {
        networkBreakdown[entry.network].pending += entry.amountUSD;
      }
    });

    // Detectar discrepâncias
    const discrepancies: AuditReport['discrepancies'] = [];
    
    // Verificar transações falhadas
    entries.filter(entry => entry.status === 'failed').forEach(entry => {
      discrepancies.push({
        type: 'missing_collection',
        description: `Failed fee collection for transaction ${entry.transactionId}`,
        transactionId: entry.transactionId,
        amount: entry.amountUSD,
        timestamp: entry.timestamp
      });
    });

    // Verificar distribuições falhadas
    distributions.filter(dist => dist.status === 'failed').forEach(dist => {
      discrepancies.push({
        type: 'failed_distribution',
        description: `Failed distribution for network ${dist.network}`,
        transactionId: dist.id,
        amount: dist.amount,
        timestamp: dist.timestamp
      });
    });

    return {
      reportId: `audit_${Date.now()}`,
      period,
      summary: {
        totalRevenue,
        totalTransactions,
        totalDistributed,
        pendingDistribution,
        networkBreakdown: networkBreakdown as any
      },
      discrepancies,
      generatedAt: new Date()
    };
  }

  /**
   * Obtém todas as entradas de revenue
   */
  public getAllRevenueEntries(): RevenueEntry[] {
    return Array.from(this.revenueEntries.values());
  }

  /**
   * Obtém histórico de distribuições
   */
  public getDistributionHistory(): DistributionTransaction[] {
    return Array.from(this.distributionHistory.values());
  }

  /**
   * Busca entradas por critérios
   */
  public searchEntries(criteria: {
    network?: NetworkType;
    status?: RevenueEntry['status'];
    dateRange?: { start: Date; end: Date };
    minAmount?: number;
    userAddress?: string;
  }): RevenueEntry[] {
    let entries = Array.from(this.revenueEntries.values());

    if (criteria.network) {
      entries = entries.filter(entry => entry.network === criteria.network);
    }

    if (criteria.status) {
      entries = entries.filter(entry => entry.status === criteria.status);
    }

    if (criteria.dateRange) {
      entries = entries.filter(entry => 
        entry.timestamp >= criteria.dateRange!.start && 
        entry.timestamp <= criteria.dateRange!.end
      );
    }

    if (criteria.minAmount) {
      entries = entries.filter(entry => entry.amountUSD >= criteria.minAmount!);
    }

    if (criteria.userAddress) {
      entries = entries.filter(entry => 
        entry.userAddress.toLowerCase() === criteria.userAddress!.toLowerCase()
      );
    }

    return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Exporta dados para CSV
   */
  public exportToCSV(entries?: RevenueEntry[]): string {
    const data = entries || Array.from(this.revenueEntries.values());
    
    const headers = [
      'ID',
      'Transaction ID',
      'Network',
      'Amount',
      'Amount USD',
      'Fee Percentage',
      'User Address',
      'Platform',
      'Status',
      'Timestamp',
      'TX Hash'
    ];

    const rows = data.map(entry => [
      entry.id,
      entry.transactionId,
      entry.network,
      entry.amount.toString(),
      entry.amountUSD.toString(),
      entry.feePercentage.toString(),
      entry.userAddress,
      entry.platform || '',
      entry.status,
      entry.timestamp.toISOString(),
      entry.txHash || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// Instância singleton para uso global
export const cypherRevenueTracker = CypherRevenueTracker.getInstance();

// Funções utilitárias exportadas
export function formatRevenueAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(amount);
}

export function formatGrowthPercentage(growth: number): string {
  const sign = growth >= 0 ? '+' : '';
  return `${sign}${growth.toFixed(2)}%`;
}

export function getStatusDisplayName(status: RevenueEntry['status']): string {
  const names = {
    pending: 'Pending',
    collected: 'Collected',
    distributed: 'Distributed',
    failed: 'Failed'
  };
  
  return names[status];
}

export function getStatusColor(status: RevenueEntry['status']): string {
  const colors = {
    pending: 'yellow',
    collected: 'blue',
    distributed: 'green',
    failed: 'red'
  };
  
  return colors[status];
}