// Automated fee collection system for QuickTrade with smart settlements
import { quickTradeCache } from '../cache/advancedQuickTradeCache';
import { quickTradeErrorHandler } from '../errorHandling/quickTradeErrorHandler';
import { realTimeGasEstimator } from '../gasEstimation/realTimeGasEstimator';

interface FeeCollectionRecord {
  id: string;
  transactionHash: string;
  userAddress: string;
  dex: string;
  network: string;
  feeAmount: string;
  feeAmountUSD: number;
  token: string;
  status: 'pending' | 'collected' | 'failed' | 'refunded';
  attempts: number;
  createdAt: number;
  collectedAt?: number;
  gasUsed?: string;
  gasCostUSD?: number;
  settlementBatch?: string;
}

interface SettlementBatch {
  id: string;
  network: string;
  totalFees: string;
  totalFeesUSD: number;
  records: FeeCollectionRecord[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  gasEstimate: string;
  gasCostUSD: number;
  profitability: number;
  createdAt: number;
  processedAt?: number;
  transactionHash?: string;
}

interface CollectionConfig {
  batchSize: number;
  minBatchValue: number; // USD
  maxBatchDelay: number; // milliseconds
  gasOptimization: boolean;
  profitabilityThreshold: number; // percentage
  retryAttempts: number;
  networks: string[];
}

class AutomatedFeeCollector {
  private config: CollectionConfig;
  private pendingRecords = new Map<string, FeeCollectionRecord[]>();
  private activeBatches = new Map<string, SettlementBatch>();
  private collectionStats = new Map<string, {
    totalCollected: number;
    totalFees: number;
    successRate: number;
    averageGasCost: number;
    lastCollection: number;
  }>();

  // Revenue wallet addresses
  private revenueWallets = {
    ethereum: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    arbitrum: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    optimism: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    polygon: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    base: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    avalanche: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    bsc: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    solana: '4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH'
  };

  constructor(config: Partial<CollectionConfig> = {}) {
    this.config = {
      batchSize: 50,
      minBatchValue: 100, // $100 minimum per batch
      maxBatchDelay: 3600000, // 1 hour maximum delay
      gasOptimization: true,
      profitabilityThreshold: 0.05, // 5% minimum profit
      retryAttempts: 3,
      networks: ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'avalanche', 'bsc', 'solana'],
      ...config
    };

    // Initialize pending records for each network
    this.config.networks.forEach(network => {
      this.pendingRecords.set(network, []);
    });

    this.startAutomatedCollection();
  }

  private startAutomatedCollection() {
    // Process collections every 5 minutes
    setInterval(() => {
      this.processAllNetworks();
    }, 300000);

    // Force collection for old batches every hour
    setInterval(() => {
      this.forceOldBatches();
    }, 3600000);

    // Update statistics every 15 minutes
    setInterval(() => {
      this.updateStatistics();
    }, 900000);
  }

  // Record a new fee for collection
  async recordFee(
    transactionHash: string,
    userAddress: string,
    dex: string,
    network: string,
    feeAmount: string,
    feeAmountUSD: number,
    token: string = 'native'
  ): Promise<FeeCollectionRecord> {
    const record: FeeCollectionRecord = {
      id: this.generateFeeId(),
      transactionHash,
      userAddress,
      dex,
      network,
      feeAmount,
      feeAmountUSD,
      token,
      status: 'pending',
      attempts: 0,
      createdAt: Date.now()
    };

    // Add to pending records
    const networkRecords = this.pendingRecords.get(network) || [];
    networkRecords.push(record);
    this.pendingRecords.set(network, networkRecords);

    // Cache the record
    await this.cacheRecord(record);

    // Trigger immediate processing if batch is ready
    await this.checkBatchReadiness(network);

    return record;
  }

  private async checkBatchReadiness(network: string): Promise<void> {
    const records = this.pendingRecords.get(network) || [];
    
    if (records.length >= this.config.batchSize) {
      await this.createSettlementBatch(network, 'size_threshold');
    } else {
      // Check value threshold
      const totalValue = records.reduce((sum, record) => sum + record.feeAmountUSD, 0);
      if (totalValue >= this.config.minBatchValue * 2) { // 2x threshold for value-based batching
        await this.createSettlementBatch(network, 'value_threshold');
      }
    }
  }

  private async createSettlementBatch(network: string, trigger: string): Promise<SettlementBatch | null> {
    const records = this.pendingRecords.get(network) || [];
    
    if (records.length === 0) return null;

    // Take records for batching
    const batchRecords = records.splice(0, this.config.batchSize);
    const totalFees = batchRecords.reduce((sum, record) => sum + parseFloat(record.feeAmount), 0);
    const totalFeesUSD = batchRecords.reduce((sum, record) => sum + record.feeAmountUSD, 0);

    // Estimate gas cost
    const gasEstimate = await this.estimateCollectionGas(network, batchRecords.length);
    const gasCostUSD = await this.calculateGasCostUSD(network, gasEstimate.gasLimit, gasEstimate.gasPrice);
    
    // Calculate profitability
    const profitability = ((totalFeesUSD - gasCostUSD) / totalFeesUSD) * 100;

    // Check profitability threshold
    if (profitability < this.config.profitabilityThreshold) {
      // Return records to pending if not profitable
      this.pendingRecords.set(network, [...batchRecords, ...records]);
      return null;
    }

    const batch: SettlementBatch = {
      id: this.generateBatchId(),
      network,
      totalFees: totalFees.toString(),
      totalFeesUSD,
      records: batchRecords,
      status: 'pending',
      gasEstimate: gasEstimate.gasLimit,
      gasCostUSD,
      profitability,
      createdAt: Date.now()
    };

    // Update record status and batch reference
    batchRecords.forEach(record => {
      record.settlementBatch = batch.id;
    });

    this.activeBatches.set(batch.id, batch);

    // Process the batch immediately if conditions are favorable
    if (profitability > 20 || totalFeesUSD > this.config.minBatchValue * 5) {
      await this.processBatch(batch.id);
    }

    return batch;
  }

  private async processBatch(batchId: string): Promise<boolean> {
    const batch = this.activeBatches.get(batchId);
    if (!batch || batch.status !== 'pending') {
      return false;
    }

    batch.status = 'processing';
    batch.processedAt = Date.now();

    try {
      // Execute the settlement transaction
      const transactionResult = await this.executeSettlement(batch);
      
      if (transactionResult.success) {
        batch.status = 'completed';
        batch.transactionHash = transactionResult.transactionHash;

        // Update all records in the batch
        batch.records.forEach(record => {
          record.status = 'collected';
          record.collectedAt = Date.now();
          record.gasUsed = transactionResult.gasUsed;
          record.gasCostUSD = batch.gasCostUSD / batch.records.length; // Distribute gas cost
        });

        // Update statistics
        this.updateCollectionStats(batch.network, batch);

        return true;
      } else {
        throw new Error(transactionResult.error || 'Settlement transaction failed');
      }
    } catch (error) {
      console.error(`❌ Settlement batch failed: ${batchId}`, error);
      
      batch.status = 'failed';
      
      // Mark all records as failed and return to pending
      batch.records.forEach(record => {
        record.status = 'pending';
        record.attempts += 1;
        record.settlementBatch = undefined;
      });

      // Return records to pending if not too many attempts
      const retryableRecords = batch.records.filter(record => record.attempts < this.config.retryAttempts);
      const failedRecords = batch.records.filter(record => record.attempts >= this.config.retryAttempts);
      
      if (retryableRecords.length > 0) {
        const networkRecords = this.pendingRecords.get(batch.network) || [];
        this.pendingRecords.set(batch.network, [...networkRecords, ...retryableRecords]);
      }

      // Mark permanently failed records
      failedRecords.forEach(record => {
        record.status = 'failed';
      });

      return false;
    }
  }

  private async executeSettlement(batch: SettlementBatch): Promise<{
    success: boolean;
    transactionHash?: string;
    gasUsed?: string;
    error?: string;
  }> {
    return quickTradeErrorHandler.executeWithRetry(
      () => this.performSettlementTransaction(batch),
      {
        operation: 'fee_settlement',
        chainId: batch.network,
        attempt: 0,
        timestamp: Date.now(),
        metadata: {
          batchId: batch.id,
          recordCount: batch.records.length,
          totalValue: batch.totalFeesUSD
        }
      }
    );
  }

  private async performSettlementTransaction(batch: SettlementBatch): Promise<{
    success: boolean;
    transactionHash?: string;
    gasUsed?: string;
    error?: string;
  }> {
    if (batch.network === 'solana') {
      return this.executeSolanaSettlement(batch);
    } else {
      return this.executeEVMSettlement(batch);
    }
  }

  private async executeEVMSettlement(batch: SettlementBatch): Promise<{
    success: boolean;
    transactionHash?: string;
    gasUsed?: string;
    error?: string;
  }> {
    try {
      // Mock EVM settlement - in production, use actual Web3 providers
      const mockTxHash = `0x${'0'.repeat(64)}`;
      const mockGasUsed = batch.gasEstimate;

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        transactionHash: mockTxHash,
        gasUsed: mockGasUsed
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeSolanaSettlement(batch: SettlementBatch): Promise<{
    success: boolean;
    transactionHash?: string;
    gasUsed?: string;
    error?: string;
  }> {
    try {
      // Mock Solana settlement - in production, use actual Solana Web3.js
      const mockTxHash = '0'.repeat(64);
      const mockComputeUnits = '5000';

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        transactionHash: mockTxHash,
        gasUsed: mockComputeUnits
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async estimateCollectionGas(network: string, recordCount: number): Promise<{
    gasLimit: string;
    gasPrice: string;
  }> {
    try {
      // Use real-time gas estimator
      const gasEstimate = await realTimeGasEstimator.estimateGas(
        'batch_collection',
        Array(recordCount).fill('settlement'),
        this.getChainId(network),
        'standard'
      );

      return {
        gasLimit: gasEstimate.gasLimit,
        gasPrice: gasEstimate.gasPrice
      };
    } catch (error) {
      console.error('❌ Gas estimation failed:', error);
      
      // Fallback estimates
      const fallbackGas = {
        ethereum: { gasLimit: '21000', gasPrice: '25' },
        arbitrum: { gasLimit: '21000', gasPrice: '0.1' },
        optimism: { gasLimit: '21000', gasPrice: '0.001' },
        polygon: { gasLimit: '21000', gasPrice: '30' },
        base: { gasLimit: '21000', gasPrice: '0.001' },
        avalanche: { gasLimit: '21000', gasPrice: '25' },
        bsc: { gasLimit: '21000', gasPrice: '5' },
        solana: { gasLimit: '5000', gasPrice: '0.000005' }
      };

      return fallbackGas[network as keyof typeof fallbackGas] || fallbackGas.ethereum;
    }
  }

  private async calculateGasCostUSD(network: string, gasLimit: string, gasPrice: string): Promise<number> {
    try {
      const networkPrices = await this.getNativeTokenPrices();
      const nativePrice = networkPrices[network] || 2850;
      
      if (network === 'solana') {
        // Solana uses lamports
        const costSOL = parseFloat(gasLimit) * parseFloat(gasPrice);
        return costSOL * nativePrice;
      } else {
        // EVM chains use gwei
        const costETH = (parseFloat(gasLimit) * parseFloat(gasPrice)) / 1e9;
        return costETH * nativePrice;
      }
    } catch (error) {
      console.error('❌ Gas cost calculation failed:', error);
      return 5; // $5 fallback
    }
  }

  private async getNativeTokenPrices(): Promise<Record<string, number>> {
    const cacheKey = 'native_token_prices';
    // Mock prices - in production, fetch from CoinGecko or other price API
    const prices: Record<string, number> = {
      ethereum: 2850,
      arbitrum: 2850, // Uses ETH
      optimism: 2850, // Uses ETH
      polygon: 0.8,   // MATIC
      base: 2850,     // Uses ETH
      avalanche: 25,  // AVAX
      bsc: 320,       // BNB
      solana: 95      // SOL
    };

    return prices;
  }

  private async processAllNetworks(): Promise<void> {
    const promises = this.config.networks.map(network =>
      quickTradeErrorHandler.executeWithRetry(
        () => this.processNetworkCollections(network),
        {
          operation: 'network_processing',
          chainId: network,
          attempt: 0,
          timestamp: Date.now()
        }
      )
    );

    await Promise.allSettled(promises);
  }

  private async processNetworkCollections(network: string): Promise<void> {
    const records = this.pendingRecords.get(network) || [];
    
    if (records.length === 0) return;

    // Check for old records that need forced collection
    const oldRecords = records.filter(
      record => Date.now() - record.createdAt > this.config.maxBatchDelay
    );

    if (oldRecords.length > 0) {
      await this.createSettlementBatch(network, 'time_threshold');
    }

    // Process any pending batches for this network
    const networkBatches = Array.from(this.activeBatches.values())
      .filter(batch => batch.network === network && batch.status === 'pending');

    for (const batch of networkBatches) {
      await this.processBatch(batch.id);
    }
  }

  private async forceOldBatches(): Promise<void> {
    const oldBatches = Array.from(this.activeBatches.values())
      .filter(batch => 
        batch.status === 'pending' && 
        Date.now() - batch.createdAt > this.config.maxBatchDelay * 2
      );

    for (const batch of oldBatches) {
      await this.processBatch(batch.id);
    }
  }

  private updateCollectionStats(network: string, batch: SettlementBatch): void {
    const stats = this.collectionStats.get(network) || {
      totalCollected: 0,
      totalFees: 0,
      successRate: 0,
      averageGasCost: 0,
      lastCollection: 0
    };

    stats.totalCollected += 1;
    stats.totalFees += batch.totalFeesUSD;
    stats.averageGasCost = (stats.averageGasCost * (stats.totalCollected - 1) + batch.gasCostUSD) / stats.totalCollected;
    stats.lastCollection = Date.now();

    // Calculate success rate
    const allBatches = Array.from(this.activeBatches.values())
      .filter(b => b.network === network);
    const successfulBatches = allBatches.filter(b => b.status === 'completed').length;
    stats.successRate = (successfulBatches / allBatches.length) * 100;

    this.collectionStats.set(network, stats);
  }

  private async updateStatistics(): Promise<void> {
    const stats = this.getAllStats();
    
    // Cache statistics for dashboard
    await quickTradeCache.cacheAnalytics('fee_collection_stats', stats);
    
  }

  // Helper methods
  private generateFeeId(): string {
    return `fee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getChainId(network: string): string {
    const chainIds: Record<string, string> = {
      ethereum: '1',
      arbitrum: '42161',
      optimism: '10',
      polygon: '137',
      base: '8453',
      avalanche: '43114',
      bsc: '56',
      solana: 'solana'
    };
    return chainIds[network] || '1';
  }

  private async cacheRecord(record: FeeCollectionRecord): Promise<void> {
    await quickTradeCache.cacheAnalytics(`fee_record_${record.id}`, record);
  }

  // Public API methods
  async getRecord(recordId: string): Promise<FeeCollectionRecord | null> {
    return await quickTradeCache.getAnalytics(`fee_record_${recordId}`);
  }

  async getBatch(batchId: string): Promise<SettlementBatch | null> {
    return this.activeBatches.get(batchId) || null;
  }

  getAllStats(): {
    overall: {
      totalFeesUSD: number;
      totalBatches: number;
      averageSuccessRate: number;
      totalGasCostUSD: number;
      netProfitUSD: number;
    };
    byNetwork: Record<string, any>;
    pending: Record<string, number>;
    activeBatches: number;
  } {
    const overall = {
      totalFeesUSD: 0,
      totalBatches: 0,
      averageSuccessRate: 0,
      totalGasCostUSD: 0,
      netProfitUSD: 0
    };

    const byNetwork: Record<string, any> = {};
    const pending: Record<string, number> = {};

    // Calculate overall stats
    for (const [network, stats] of this.collectionStats) {
      overall.totalFeesUSD += stats.totalFees;
      overall.totalBatches += stats.totalCollected;
      overall.totalGasCostUSD += stats.averageGasCost * stats.totalCollected;
      
      byNetwork[network] = { ...stats };
    }

    // Calculate pending records
    for (const [network, records] of this.pendingRecords) {
      pending[network] = records.length;
    }

    overall.averageSuccessRate = Array.from(this.collectionStats.values())
      .reduce((sum, stats) => sum + stats.successRate, 0) / this.collectionStats.size;
    
    overall.netProfitUSD = overall.totalFeesUSD - overall.totalGasCostUSD;

    return {
      overall,
      byNetwork,
      pending,
      activeBatches: this.activeBatches.size
    };
  }

  async forceCollection(network?: string): Promise<void> {
    if (network) {
      await this.processNetworkCollections(network);
    } else {
      await this.processAllNetworks();
    }
  }

  getRevenueWallet(network: string): string {
    return this.revenueWallets[network as keyof typeof this.revenueWallets] || this.revenueWallets.ethereum;
  }

  // Health check
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    details: any;
  } {
    const stats = this.getAllStats();
    const pendingCount = Object.values(stats.pending).reduce((sum, count) => sum + count, 0);
    const oldestPending = Math.min(
      ...Array.from(this.pendingRecords.values())
        .flat()
        .map(record => Date.now() - record.createdAt)
    );

    let status: 'healthy' | 'degraded' | 'critical';

    if (pendingCount > 500 || oldestPending > this.config.maxBatchDelay * 3) {
      status = 'critical';
    } else if (pendingCount > 200 || oldestPending > this.config.maxBatchDelay * 2) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      details: {
        pendingRecords: pendingCount,
        activeBatches: stats.activeBatches,
        oldestPendingAge: oldestPending,
        successRate: stats.overall.averageSuccessRate,
        profitability: ((stats.overall.netProfitUSD / stats.overall.totalFeesUSD) * 100) || 0
      }
    };
  }
}

// Export singleton instance
export const automatedFeeCollector = new AutomatedFeeCollector();

// Export types
export type {
  FeeCollectionRecord,
  SettlementBatch,
  CollectionConfig,
};
export { AutomatedFeeCollector };