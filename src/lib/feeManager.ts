/**
 * 💰 CYPHER FEE MANAGER v2.0
 * Sistema principal de gerenciamento de taxas 0.34%
 * Calcula, coleta e distribui taxas automaticamente
 * Suporte para Quick Trade com múltiplas redes
 */

import { Token, FeeStructure } from '@/types/quickTrade'
import { FEE_PERCENTAGE, FEE_CONFIG, WALLET_ADDRESSES } from '@/config/feeRecipients';

// Tipos de rede suportadas
export type NetworkType = 'bitcoin' | 'ethereum' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism' | 'base' | 'avalanche' | 'solana';

// Interface para transação
export interface Transaction {
  id: string;
  network: NetworkType;
  amount: number;
  tokenSymbol: string;
  usdValue: number;
  userAddress: string;
  timestamp: Date;
  txHash?: string;
  platform?: string;
}

// Interface para taxa calculada
export interface CalculatedFee {
  feeAmount: number;
  feeAmountUSD: number;
  feePercentage: number;
  network: NetworkType;
  recipientAddress: string;
  isValidTransaction: boolean;
  minimumRequired: number;
  transactionId: string;
}

// Interface para resultado de coleta
export interface FeeCollectionResult {
  success: boolean;
  transactionId: string;
  feeAmount: number;
  txHash?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Classe principal do Fee Manager
 */
export class CypherFeeManager {
  private static instance: CypherFeeManager;
  
  private constructor() {}
  
  public static getInstance(): CypherFeeManager {
    if (!CypherFeeManager.instance) {
      CypherFeeManager.instance = new CypherFeeManager();
    }
    return CypherFeeManager.instance;
  }

  /**
   * Calcula a taxa Cypher de 0.20% para uma transação
   */
  public calculateFee(transaction: Transaction): CalculatedFee {
    const feeAmount = transaction.usdValue * FEE_PERCENTAGE;
    const recipientAddress = this.getFeeRecipientAddress(transaction.network);
    const isValidTransaction = transaction.usdValue >= FEE_CONFIG.minimumTransactionUSD;

    return {
      feeAmount: transaction.amount * FEE_PERCENTAGE,
      feeAmountUSD: feeAmount,
      feePercentage: FEE_CONFIG.serviceFeePercentage,
      network: transaction.network,
      recipientAddress,
      isValidTransaction,
      minimumRequired: FEE_CONFIG.minimumTransactionUSD,
      transactionId: transaction.id,
    };
  }

  /**
   * Retorna o endereço correto para coleta de taxas por rede
   */
  public getFeeRecipientAddress(network: NetworkType): string {
    switch (network) {
      case 'bitcoin':
        return WALLET_ADDRESSES.BITCOIN;
      case 'solana':
        return WALLET_ADDRESSES.SOLANA;
      case 'ethereum':
      case 'polygon':
      case 'bsc':
      case 'arbitrum':
      case 'optimism':
      case 'base':
      case 'avalanche':
      default:
        return WALLET_ADDRESSES.EVM;
    }
  }

  /**
   * Verifica se uma transação atende aos requisitos mínimos
   */
  public validateTransaction(transaction: Transaction): {
    isValid: boolean;
    reason?: string;
  } {
    if (transaction.usdValue < FEE_CONFIG.minimumTransactionUSD) {
      return {
        isValid: false,
        reason: `Minimum transaction value is $${FEE_CONFIG.minimumTransactionUSD} (current: $${transaction.usdValue.toFixed(2)})`
      };
    }

    if (transaction.amount <= 0) {
      return {
        isValid: false,
        reason: 'Transaction amount must be greater than 0'
      };
    }

    if (!this.isNetworkSupported(transaction.network)) {
      return {
        isValid: false,
        reason: `Network ${transaction.network} is not supported`
      };
    }

    return { isValid: true };
  }

  /**
   * Verifica se uma rede é suportada
   */
  public isNetworkSupported(network: string): boolean {
    const supportedNetworks: NetworkType[] = [
      'bitcoin',
      'ethereum',
      'polygon',
      'bsc',
      'arbitrum',
      'optimism',
      'base',
      'avalanche',
      'solana'
    ];
    return supportedNetworks.includes(network as NetworkType);
  }

  /**
   * Processa uma transação e calcula as taxas
   */
  public async processTransaction(transaction: Transaction): Promise<{
    calculatedFee: CalculatedFee;
    validation: { isValid: boolean; reason?: string };
  }> {
    const validation = this.validateTransaction(transaction);
    const calculatedFee = this.calculateFee(transaction);

    return {
      calculatedFee,
      validation
    };
  }

  /**
   * Simula a coleta de taxa (placeholder para integração real)
   */
  public async simulateFeeCollection(
    calculatedFee: CalculatedFee,
    userAddress: string
  ): Promise<FeeCollectionResult> {
    try {
      // Aqui seria integrada a lógica real de coleta de taxa
      // Por exemplo: chamar APIs de exchanges, criar transações on-chain, etc.
      
      const result: FeeCollectionResult = {
        success: true,
        transactionId: calculatedFee.transactionId,
        feeAmount: calculatedFee.feeAmountUSD,
        txHash: `sim_${Date.now()}_${calculatedFee.transactionId}`,
        timestamp: new Date()
      };

      return result;
    } catch (error) {
      console.error('❌ CYPHER FEE COLLECTION ERROR:', error);
      
      return {
        success: false,
        transactionId: calculatedFee.transactionId,
        feeAmount: calculatedFee.feeAmountUSD,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Gera informações de taxa para exibição ao usuário
   */
  public generateFeeDisplay(calculatedFee: CalculatedFee): {
    feeText: string;
    feeAmountText: string;
    recipientText: string;
    networkText: string;
  } {
    return {
      feeText: `Cypher Fee: ${calculatedFee.feePercentage}%`,
      feeAmountText: `$${calculatedFee.feeAmountUSD.toFixed(4)}`,
      recipientText: this.formatAddress(calculatedFee.recipientAddress, calculatedFee.network),
      networkText: calculatedFee.network.toUpperCase()
    };
  }

  /**
   * Formata endereço para exibição
   */
  private formatAddress(address: string, network: NetworkType): string {
    if (network === 'bitcoin') {
      return `${address.slice(0, 8)}...${address.slice(-6)}`;
    } else if (network === 'solana') {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    } else {
      // EVM addresses
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
  }

  /**
   * Obtém estatísticas de taxas coletadas
   */
  public async getFeeStats(): Promise<{
    totalFeesCollected: number;
    totalTransactions: number;
    feesByNetwork: Record<NetworkType, number>;
    lastUpdated: Date;
  }> {
    // Esta função seria conectada a um banco de dados real
    // Por enquanto, retorna dados simulados
    return {
      totalFeesCollected: 0,
      totalTransactions: 0,
      feesByNetwork: {
        bitcoin: 0,
        ethereum: 0,
        polygon: 0,
        bsc: 0,
        arbitrum: 0,
        optimism: 0,
        base: 0,
        avalanche: 0,
        solana: 0
      },
      lastUpdated: new Date()
    };
  }
}

// Instância singleton para uso global
export const cypherFeeManager = CypherFeeManager.getInstance();

// Funções utilitárias exportadas
export function calculateCypherFee(usdValue: number): number {
  return usdValue * FEE_PERCENTAGE;
}

export function formatFeeAmount(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

export function getFeePercentageText(): string {
  return `${FEE_CONFIG.serviceFeePercentage}%`;
}

// Constantes exportadas
export const CYPHER_FEE_PERCENTAGE = FEE_CONFIG.serviceFeePercentage;
export const CYPHER_MIN_TRANSACTION = FEE_CONFIG.minimumTransactionUSD;
export const CYPHER_FEE_ADDRESSES = WALLET_ADDRESSES;