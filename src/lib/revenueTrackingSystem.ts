/**
 * CYPHER ORDI FUTURE - Sistema de Revenue Tracking
 * Agent 3 - Fee Calculation e Revenue Analytics
 * 
 * Features:
 * - Tracking em tempo real de todas as fees
 * - Analytics avançadas de revenue
 * - Distribuição automática de fees
 * - Dashboard de métricas financeiras
 * - Export de relatórios
 */

import { REVENUE_WALLETS, FEE_CONFIG } from '../config/quicktrade';

interface FeeTransaction {
  id: string;
  timestamp: number;
  userAddress: string;
  tokenIn: string;
  tokenOut: string;
  inputAmount: number;
  outputAmount: number;
  serviceFee: number;
  feePercentage: number;
  dex: string;
  chain: string;
  transactionHash?: string;
  status: 'pending' | 'completed' | 'failed';
  revenueWallet: string;
}

interface RevenueMetrics {
  totalRevenue: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalTransactions: number;
  averageFee: number;
  topDEX: string;
  topChain: string;
  growthRate: number;
  projectedMonthly: number;
}

interface DEXPerformance {
  dex: string;
  totalVolume: number;
  totalFees: number;
  transactionCount: number;
  averageFee: number;
  successRate: number;
  marketShare: number;
}

class RevenueTrackingSystem {
  private transactions: Map<string, FeeTransaction> = new Map();
  private dailyMetrics: Map<string, number> = new Map();
  private dexPerformance: Map<string, DEXPerformance> = new Map();
  
  constructor() {
    this.initializeTracking();
  }

  /**
   * Inicializar sistema de tracking
   */
  private initializeTracking(): void {
    
    // Setup de limpeza automática de dados antigos
    setInterval(() => {
      this.cleanOldData();
    }, 24 * 60 * 60 * 1000); // Diário
    
    // Setup de relatórios automáticos
    setInterval(() => {
      this.generateAutomaticReport();
    }, 60 * 60 * 1000); // Hourly
  }

  /**
   * Calcular e registrar taxa de serviço
   */
  calculateAndTrackFee(
    userAddress: string,
    tokenIn: string,
    tokenOut: string,
    inputAmount: number,
    outputAmount: number,
    dex: string,
    chain: string
  ): {
    serviceFee: number;
    feeInUSD: number;
    feePercentage: number;
    revenueWallet: string;
    transactionId: string;
  } {
    // Calcular taxa com base no valor de entrada
    const serviceFee = inputAmount * FEE_CONFIG.percentage;
    const feeInUSD = serviceFee; // Assumindo que inputAmount já está em USD
    
    // Gerar ID único
    const transactionId = `fee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determinar carteira de destino
    const revenueWallet = REVENUE_WALLETS[chain] || REVENUE_WALLETS.ethereum;
    
    // Criar registro de transação
    const feeTransaction: FeeTransaction = {
      id: transactionId,
      timestamp: Date.now(),
      userAddress,
      tokenIn,
      tokenOut,
      inputAmount,
      outputAmount,
      serviceFee,
      feePercentage: FEE_CONFIG.percentage,
      dex,
      chain,
      status: 'pending',
      revenueWallet
    };
    
    // Salvar transação
    this.transactions.set(transactionId, feeTransaction);
    
    // Atualizar métricas
    this.updateMetrics(feeTransaction);
    
    
    return {
      serviceFee,
      feeInUSD,
      feePercentage: FEE_CONFIG.percentage,
      revenueWallet,
      transactionId
    };
  }

  /**
   * Marcar transação como concluída
   */
  markTransactionCompleted(transactionId: string, transactionHash: string): void {
    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      transaction.status = 'completed';
      transaction.transactionHash = transactionHash;
      this.transactions.set(transactionId, transaction);
      
      
      // Emit event para dashboard
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('revenueTransactionCompleted', {
          detail: transaction
        }));
      }
    }
  }

  /**
   * Marcar transação como falha
   */
  markTransactionFailed(transactionId: string, error: string): void {
    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      transaction.status = 'failed';
      this.transactions.set(transactionId, transaction);
      
    }
  }

  /**
   * Obter métricas de revenue
   */
  getRevenueMetrics(): RevenueMetrics {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    const allTransactions = Array.from(this.transactions.values());
    const completedTransactions = allTransactions.filter(t => t.status === 'completed');
    
    // Revenue por período
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.serviceFee, 0);
    const dailyRevenue = completedTransactions
      .filter(t => t.timestamp > oneDayAgo)
      .reduce((sum, t) => sum + t.serviceFee, 0);
    const weeklyRevenue = completedTransactions
      .filter(t => t.timestamp > oneWeekAgo)
      .reduce((sum, t) => sum + t.serviceFee, 0);
    const monthlyRevenue = completedTransactions
      .filter(t => t.timestamp > oneMonthAgo)
      .reduce((sum, t) => sum + t.serviceFee, 0);
    
    // Métricas gerais
    const totalTransactions = completedTransactions.length;
    const averageFee = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // DEX e Chain mais usados
    const dexCounts = new Map<string, number>();
    const chainCounts = new Map<string, number>();
    
    completedTransactions.forEach(t => {
      dexCounts.set(t.dex, (dexCounts.get(t.dex) || 0) + 1);
      chainCounts.set(t.chain, (chainCounts.get(t.chain) || 0) + 1);
    });
    
    const topDEX = Array.from(dexCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
    const topChain = Array.from(chainCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
    
    // Growth rate (comparar últimos 7 dias vs 7 dias anteriores)
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
    const previousWeekRevenue = completedTransactions
      .filter(t => t.timestamp > twoWeeksAgo && t.timestamp <= oneWeekAgo)
      .reduce((sum, t) => sum + t.serviceFee, 0);
    const currentWeekRevenue = completedTransactions
      .filter(t => t.timestamp > oneWeekAgo)
      .reduce((sum, t) => sum + t.serviceFee, 0);
    
    const growthRate = previousWeekRevenue > 0 
      ? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100 
      : 0;
    
    // Projeção mensal baseada na média diária
    const projectedMonthly = dailyRevenue * 30;
    
    return {
      totalRevenue,
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      totalTransactions,
      averageFee,
      topDEX,
      topChain,
      growthRate,
      projectedMonthly
    };
  }

  /**
   * Obter performance por DEX
   */
  getDEXPerformance(): DEXPerformance[] {
    const completedTransactions = Array.from(this.transactions.values())
      .filter(t => t.status === 'completed');
    
    const dexStats = new Map<string, {
      totalVolume: number;
      totalFees: number;
      transactionCount: number;
      successCount: number;
    }>();
    
    // Calcular estatísticas por DEX
    Array.from(this.transactions.values()).forEach(t => {
      const current = dexStats.get(t.dex) || {
        totalVolume: 0,
        totalFees: 0,
        transactionCount: 0,
        successCount: 0
      };
      
      current.totalVolume += t.inputAmount;
      current.transactionCount += 1;
      
      if (t.status === 'completed') {
        current.totalFees += t.serviceFee;
        current.successCount += 1;
      }
      
      dexStats.set(t.dex, current);
    });
    
    const totalVolume = completedTransactions.reduce((sum, t) => sum + t.inputAmount, 0);
    
    // Converter para array de performance
    return Array.from(dexStats.entries()).map(([dex, stats]) => ({
      dex,
      totalVolume: stats.totalVolume,
      totalFees: stats.totalFees,
      transactionCount: stats.transactionCount,
      averageFee: stats.transactionCount > 0 ? stats.totalFees / stats.successCount : 0,
      successRate: stats.transactionCount > 0 ? (stats.successCount / stats.transactionCount) * 100 : 0,
      marketShare: totalVolume > 0 ? (stats.totalVolume / totalVolume) * 100 : 0
    })).sort((a, b) => b.totalVolume - a.totalVolume);
  }

  /**
   * Obter transações recentes
   */
  getRecentTransactions(limit: number = 50): FeeTransaction[] {
    return Array.from(this.transactions.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Obter estatísticas de wallet de revenue
   */
  getRevenueWalletStats(): Array<{
    chain: string;
    wallet: string;
    totalRevenue: number;
    transactionCount: number;
    explorerUrl: string;
  }> {
    const walletStats = new Map<string, { totalRevenue: number; transactionCount: number }>();
    
    Array.from(this.transactions.values())
      .filter(t => t.status === 'completed')
      .forEach(t => {
        const current = walletStats.get(t.chain) || { totalRevenue: 0, transactionCount: 0 };
        current.totalRevenue += t.serviceFee;
        current.transactionCount += 1;
        walletStats.set(t.chain, current);
      });
    
    return Array.from(walletStats.entries()).map(([chain, stats]) => ({
      chain,
      wallet: REVENUE_WALLETS[chain] || 'N/A',
      totalRevenue: stats.totalRevenue,
      transactionCount: stats.transactionCount,
      explorerUrl: this.getExplorerUrl(chain)
    }));
  }

  /**
   * Atualizar métricas internas
   */
  private updateMetrics(transaction: FeeTransaction): void {
    // Atualizar métricas diárias
    const dateKey = new Date(transaction.timestamp).toISOString().split('T')[0];
    const currentDaily = this.dailyMetrics.get(dateKey) || 0;
    this.dailyMetrics.set(dateKey, currentDaily + transaction.serviceFee);
    
    // Atualizar performance do DEX
    const currentDexPerf = this.dexPerformance.get(transaction.dex) || {
      dex: transaction.dex,
      totalVolume: 0,
      totalFees: 0,
      transactionCount: 0,
      averageFee: 0,
      successRate: 0,
      marketShare: 0
    };
    
    currentDexPerf.totalVolume += transaction.inputAmount;
    currentDexPerf.transactionCount += 1;
    
    this.dexPerformance.set(transaction.dex, currentDexPerf);
  }

  /**
   * Limpar dados antigos (>90 dias)
   */
  private cleanOldData(): void {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    let cleaned = 0;
    
    for (const [id, transaction] of this.transactions.entries()) {
      if (transaction.timestamp < ninetyDaysAgo) {
        this.transactions.delete(id);
        cleaned++;
      }
    }
    
  }

  /**
   * Gerar relatório automático
   */
  private generateAutomaticReport(): void {
    const metrics = this.getRevenueMetrics();
    
    if (metrics.totalTransactions > 0) {
    }
  }

  /**
   * Obter URL do explorer
   */
  private getExplorerUrl(chain: string): string {
    const explorers = {
      ethereum: 'https://etherscan.io',
      bsc: 'https://bscscan.com',
      polygon: 'https://polygonscan.com',
      arbitrum: 'https://arbiscan.io',
      optimism: 'https://optimistic.etherscan.io',
      avalanche: 'https://snowtrace.io',
      solana: 'https://solscan.io'
    };
    
    return explorers[chain] || 'https://etherscan.io';
  }

  /**
   * Export de dados para CSV
   */
  exportToCSV(): string {
    const transactions = this.getRecentTransactions(1000);
    
    const headers = [
      'ID', 'Timestamp', 'User Address', 'Token In', 'Token Out',
      'Input Amount', 'Output Amount', 'Service Fee', 'Fee %',
      'DEX', 'Chain', 'Status', 'Transaction Hash'
    ];
    
    const rows = transactions.map(t => [
      t.id,
      new Date(t.timestamp).toISOString(),
      t.userAddress,
      t.tokenIn,
      t.tokenOut,
      t.inputAmount.toString(),
      t.outputAmount.toString(),
      t.serviceFee.toString(),
      (t.feePercentage * 100).toString(),
      t.dex,
      t.chain,
      t.status,
      t.transactionHash || ''
    ]);
    
    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }

  /**
   * Get revenue projection
   */
  getRevenueProjection(days: number = 30): {
    projectedRevenue: number;
    confidence: number;
    basedOnDays: number;
  } {
    const recentTransactions = Array.from(this.transactions.values())
      .filter(t => t.status === 'completed' && t.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentRevenue = recentTransactions.reduce((sum, t) => sum + t.serviceFee, 0);
    const dailyAverage = recentRevenue / 7;
    const projectedRevenue = dailyAverage * days;
    
    // Confidence based on data availability and consistency
    const confidence = Math.min(95, Math.max(50, recentTransactions.length * 5));
    
    return {
      projectedRevenue,
      confidence,
      basedOnDays: 7
    };
  }
}

// Singleton instance
const revenueTracker = new RevenueTrackingSystem();

export default revenueTracker;
export { RevenueTrackingSystem, type FeeTransaction, type RevenueMetrics, type DEXPerformance };