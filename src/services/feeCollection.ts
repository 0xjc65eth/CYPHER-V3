import { FEE_RECIPIENTS, FEE_COLLECTION_CONFIG } from '@/config/feeRecipients';
import { QUICKTRADE_CONFIG } from '@/config/quicktrade';
import { ServiceFeeV3, QuickTradeV3Transaction, TransactionStatus } from '@/types/quickTrade';

export interface FeeCollectionResult {
  success: boolean;
  transactionHash?: string;
  amountCollected: number;
  gasUsed?: number;
  gasCost?: number;
  error?: string;
  timestamp: number;
}

export interface WalletBalance {
  address: string;
  balance: string;
  balanceUSD: number;
  chainId: number | string;
  symbol: string;
}

class FeeCollectionService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  // Main fee collection function
  async collectFee(
    transaction: QuickTradeV3Transaction,
    userWalletAddress: string
  ): Promise<FeeCollectionResult> {
    try {
      
      // Validate transaction
      if (transaction.status !== TransactionStatus.COMPLETED) {
        throw new Error('Cannot collect fee from incomplete transaction');
      }

      // Determine collection method
      const collectionMethod = this.getCollectionMethod(transaction.chainId);
      
      // Execute collection based on method
      switch (collectionMethod) {
        case 'direct':
          return await this.collectDirectTransfer(transaction, userWalletAddress);
        case 'contract':
          return await this.collectViaContract(transaction, userWalletAddress);
        case 'relayer':
          return await this.collectViaRelayer(transaction, userWalletAddress);
        default:
          throw new Error(`Unsupported collection method: ${collectionMethod}`);
      }

    } catch (error) {
      console.error('Fee collection failed:', error);
      return {
        success: false,
        amountCollected: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  // Direct transfer method (most common)
  private async collectDirectTransfer(
    transaction: QuickTradeV3Transaction,
    userWalletAddress: string
  ): Promise<FeeCollectionResult> {
    const isEVM = typeof transaction.chainId === 'number';
    
    if (isEVM) {
      return await this.collectEVMDirectTransfer(transaction, userWalletAddress);
    } else {
      return await this.collectSolanaDirectTransfer(transaction, userWalletAddress);
    }
  }

  // EVM direct transfer
  private async collectEVMDirectTransfer(
    transaction: QuickTradeV3Transaction,
    userWalletAddress: string
  ): Promise<FeeCollectionResult> {
    try {
      // Mock EVM transaction - in production, use Web3/ethers.js
      
      // Simulate gas estimation
      const gasEstimate = await this.estimateEVMGas(transaction);
      
      // Check if user has enough balance for fee + gas
      const userBalance = await this.getWalletBalance(userWalletAddress, transaction.chainId);
      const totalRequired = transaction.serviceFee.amountUSD + gasEstimate.gasCostUSD;
      
      if (userBalance.balanceUSD < totalRequired) {
        throw new Error(`Insufficient balance. Required: $${totalRequired.toFixed(2)}, Available: $${userBalance.balanceUSD.toFixed(2)}`);
      }

      // Simulate transaction execution
      await this.sleep(2000); // Simulate network delay
      
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      const success = Math.random() > 0.02; // 98% success rate

      if (!success) {
        throw new Error('Transaction failed on blockchain');
      }

      // Update transaction status
      await this.updateTransactionStatus(transaction.id, {
        feeCollectionHash: mockTxHash,
        feeCollected: true,
        status: TransactionStatus.COMPLETED
      });

      return {
        success: true,
        transactionHash: mockTxHash,
        amountCollected: transaction.serviceFee.amountUSD,
        gasUsed: gasEstimate.gasUsed,
        gasCost: gasEstimate.gasCostUSD,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('EVM fee collection error:', error);
      throw error;
    }
  }

  // Solana direct transfer
  private async collectSolanaDirectTransfer(
    transaction: QuickTradeV3Transaction,
    userWalletAddress: string
  ): Promise<FeeCollectionResult> {
    try {
      
      // Simulate Solana transaction
      const gasEstimate = { gasUsed: 5000, gasCostUSD: 0.01 };
      
      const userBalance = await this.getWalletBalance(userWalletAddress, 'solana');
      const totalRequired = transaction.serviceFee.amountUSD + gasEstimate.gasCostUSD;
      
      if (userBalance.balanceUSD < totalRequired) {
        throw new Error(`Insufficient SOL balance. Required: $${totalRequired.toFixed(4)}, Available: $${userBalance.balanceUSD.toFixed(4)}`);
      }

      await this.sleep(1500); // Simulate Solana network delay
      
      const mockTxHash = Math.random().toString(36).substr(2, 88); // Solana tx format
      const success = Math.random() > 0.01; // 99% success rate

      if (!success) {
        throw new Error('Solana transaction failed');
      }

      await this.updateTransactionStatus(transaction.id, {
        feeCollectionHash: mockTxHash,
        feeCollected: true,
        status: TransactionStatus.COMPLETED
      });

      return {
        success: true,
        transactionHash: mockTxHash,
        amountCollected: transaction.serviceFee.amountUSD,
        gasUsed: gasEstimate.gasUsed,
        gasCost: gasEstimate.gasCostUSD,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Solana fee collection error:', error);
      throw error;
    }
  }

  // Smart contract collection method
  private async collectViaContract(
    transaction: QuickTradeV3Transaction,
    userWalletAddress: string
  ): Promise<FeeCollectionResult> {
    try {
      
      const contractAddress = (FEE_COLLECTION_CONFIG.CONTRACTS as Record<string, string>)[
        this.getChainKey(transaction.chainId)
      ];
      
      if (!contractAddress) {
        throw new Error('No fee collection contract deployed for this chain');
      }

      // Mock contract interaction
      await this.sleep(3000);
      
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      return {
        success: true,
        transactionHash: mockTxHash,
        amountCollected: transaction.serviceFee.amountUSD,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Contract fee collection error:', error);
      throw error;
    }
  }

  // Meta-transaction relayer method
  private async collectViaRelayer(
    transaction: QuickTradeV3Transaction,
    userWalletAddress: string
  ): Promise<FeeCollectionResult> {
    try {
      
      // Mock relayer service
      await this.sleep(4000);
      
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      return {
        success: true,
        transactionHash: mockTxHash,
        amountCollected: transaction.serviceFee.amountUSD,
        gasUsed: 0, // Gasless for user
        gasCost: 0,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Relayer fee collection error:', error);
      throw error;
    }
  }

  // Monitor fee collection with retries
  async monitorAndRetryCollection(
    transaction: QuickTradeV3Transaction,
    userWalletAddress: string
  ): Promise<FeeCollectionResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        
        const result = await this.collectFee(transaction, userWalletAddress);
        
        if (result.success) {
          return result;
        }
        
        lastError = new Error(result.error || 'Unknown collection error');
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Collection attempt ${attempt} failed:`, lastError.message);
      }

      // Wait before retry (except on last attempt)
      if (attempt < this.MAX_RETRIES) {
        await this.sleep(this.RETRY_DELAY * attempt); // Exponential backoff
      }
    }

    // All attempts failed
    return {
      success: false,
      amountCollected: 0,
      error: `Fee collection failed after ${this.MAX_RETRIES} attempts. Last error: ${lastError?.message}`,
      timestamp: Date.now()
    };
  }

  // Get current revenue statistics
  async getRevenueStats(): Promise<{
    totalCollected: number;
    totalTransactions: number;
    successRate: number;
    averageFee: number;
  }> {
    try {
      // Mock revenue data - in production, query database
      return {
        totalCollected: 125430.50,
        totalTransactions: 15420,
        successRate: 0.995,
        averageFee: 8.13
      };
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
      throw error;
    }
  }

  // Utility methods
  private getCollectionMethod(chainId: number | string): string {
    return (FEE_COLLECTION_CONFIG.DEFAULT_METHOD as Record<string | number, string>)[chainId] || 'direct';
  }

  private getChainKey(chainId: number | string): string {
    const chainMap: Record<string, string> = {
      '1': 'ETHEREUM',
      '42161': 'ARBITRUM',
      '10': 'OPTIMISM',
      '137': 'POLYGON',
      '8453': 'BASE',
      '43114': 'AVALANCHE',
      '56': 'BSC'
    };
    return chainMap[chainId.toString()] || 'ETHEREUM';
  }

  private async estimateEVMGas(transaction: QuickTradeV3Transaction): Promise<{
    gasUsed: number;
    gasCostUSD: number;
  }> {
    // Mock gas estimation - in production, use Web3 gas estimation
    const baseGas = 21000;
    const gasPrice = 20; // 20 gwei
    const ethPrice = 2850;
    
    const gasUsed = baseGas + Math.floor(Math.random() * 30000);
    const gasCostETH = (gasUsed * gasPrice * 1e-9);
    const gasCostUSD = gasCostETH * ethPrice;
    
    return { gasUsed, gasCostUSD };
  }

  private async getWalletBalance(
    address: string,
    chainId: number | string
  ): Promise<WalletBalance> {
    // Mock balance check - in production, use Web3 providers
    const balances: Record<string, number> = {
      'ethereum': Math.random() * 10 + 1,
      'solana': Math.random() * 100 + 10,
      'polygon': Math.random() * 1000 + 100
    };
    
    const chainKey = typeof chainId === 'string' ? chainId : 'ethereum';
    const balance = balances[chainKey] || Math.random() * 5 + 0.1;
    
    const prices: Record<string, number> = {
      'ethereum': 2850,
      'solana': 95,
      'polygon': 0.8
    };
    
    const price = prices[chainKey] || 2850;
    
    return {
      address,
      balance: balance.toString(),
      balanceUSD: balance * price,
      chainId,
      symbol: chainKey === 'solana' ? 'SOL' : chainKey === 'polygon' ? 'MATIC' : 'ETH'
    };
  }

  private async updateTransactionStatus(
    transactionId: string,
    updates: Partial<{
      feeCollectionHash: string;
      feeCollected: boolean;
      status: TransactionStatus;
    }>
  ): Promise<void> {
    // Mock database update - in production, update database
    await this.sleep(100);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const feeCollectionService = new FeeCollectionService();

// Export helper functions for API routes
export const collectFee = (transaction: QuickTradeV3Transaction, userWalletAddress: string) =>
  feeCollectionService.collectFee(transaction, userWalletAddress);

export const monitorAndRetryCollection = (transaction: QuickTradeV3Transaction, userWalletAddress: string) =>
  feeCollectionService.monitorAndRetryCollection(transaction, userWalletAddress);

export const getRevenueStats = () =>
  feeCollectionService.getRevenueStats();