/**
 * 💰 CYPHER FEES HOOK
 * Hook customizado para gerenciar taxas Cypher
 * Facilita integração do sistema de fees nos componentes
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { cypherFeeManager, Transaction, CalculatedFee, NetworkType } from '@/lib/feeManager';
import { cypherFeeDistributor } from '@/lib/feeDistribution';
import { cypherRevenueTracker } from '@/lib/revenueTracking';

// Interface para configuração do hook
interface UseCypherFeesConfig {
  network: NetworkType;
  userAddress?: string;
  autoCalculate?: boolean;
  onFeeCalculated?: (fee: CalculatedFee) => void;
  onFeeCollected?: (success: boolean, result: any) => void;
}

// Interface para retorno do hook
interface UseCypherFeesReturn {
  // Estados
  calculatedFee: CalculatedFee | null;
  isValidTransaction: boolean;
  validationMessage: string;
  isCalculating: boolean;
  isCollecting: boolean;
  
  // Funções
  calculateFee: (amount: number, tokenSymbol: string, usdValue: number) => Promise<CalculatedFee>;
  collectFee: (transactionId: string, txHash?: string) => Promise<boolean>;
  validateTransaction: (amount: number, usdValue: number) => { isValid: boolean; reason?: string };
  
  // Utilidades
  formatFeeAmount: (amount: number) => string;
  getFeePercentage: () => number;
  getRecipientAddress: () => string;
  getMinimumTransaction: () => number;
}

export function useCypherFees(config: UseCypherFeesConfig): UseCypherFeesReturn {
  const [calculatedFee, setCalculatedFee] = useState<CalculatedFee | null>(null);
  const [isValidTransaction, setIsValidTransaction] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);

  // Função para calcular taxa
  const calculateFee = useCallback(async (
    amount: number,
    tokenSymbol: string,
    usdValue: number
  ): Promise<CalculatedFee> => {
    setIsCalculating(true);
    
    try {
      const transaction: Transaction = {
        id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        network: config.network,
        amount,
        tokenSymbol,
        usdValue,
        userAddress: config.userAddress || '',
        timestamp: new Date()
      };

      // Processar transação
      const { calculatedFee: fee, validation } = await cypherFeeManager.processTransaction(transaction);
      
      setCalculatedFee(fee);
      setIsValidTransaction(validation.isValid);
      setValidationMessage(validation.reason || '');

      // Callback para componente pai
      if (config.onFeeCalculated) {
        config.onFeeCalculated(fee);
      }

      return fee;
    } catch (error) {
      console.error('Error calculating fee:', error);
      setIsValidTransaction(false);
      setValidationMessage('Error calculating fee');
      throw error;
    } finally {
      setIsCalculating(false);
    }
  }, [config.network, config.userAddress, config.onFeeCalculated]);

  // Função para coletar taxa
  const collectFee = useCallback(async (
    transactionId: string,
    txHash?: string
  ): Promise<boolean> => {
    if (!calculatedFee) {
      throw new Error('No calculated fee available');
    }

    setIsCollecting(true);

    try {
      // Simular coleta de taxa
      const collectionResult = await cypherFeeManager.simulateFeeCollection(
        calculatedFee,
        config.userAddress || ''
      );

      if (collectionResult.success) {
        // Criar transação para registro
        const transaction: Transaction = {
          id: transactionId,
          network: config.network,
          amount: calculatedFee.feeAmount,
          tokenSymbol: 'TOKEN',
          usdValue: calculatedFee.feeAmountUSD,
          userAddress: config.userAddress || '',
          timestamp: new Date(),
          txHash: txHash || collectionResult.txHash
        };

        // Registrar no revenue tracker
        const revenueEntry = await cypherRevenueTracker.recordRevenue(
          transaction,
          calculatedFee,
          collectionResult.txHash
        );

        // Atualizar status
        cypherRevenueTracker.updateRevenueStatus(
          revenueEntry.id,
          'collected',
          collectionResult.txHash
        );

        // Adicionar ao distribuidor
        await cypherFeeDistributor.addCollectedFee(calculatedFee);

      }

      // Callback para componente pai
      if (config.onFeeCollected) {
        config.onFeeCollected(collectionResult.success, collectionResult);
      }

      return collectionResult.success;
    } catch (error) {
      console.error('Error collecting fee:', error);
      
      // Callback para componente pai
      if (config.onFeeCollected) {
        config.onFeeCollected(false, { error });
      }
      
      return false;
    } finally {
      setIsCollecting(false);
    }
  }, [calculatedFee, config.network, config.userAddress, config.onFeeCollected]);

  // Função para validar transação
  const validateTransaction = useCallback((
    amount: number,
    usdValue: number
  ): { isValid: boolean; reason?: string } => {
    const transaction: Transaction = {
      id: `validate_${Date.now()}`,
      network: config.network,
      amount,
      tokenSymbol: 'TOKEN',
      usdValue,
      userAddress: config.userAddress || '',
      timestamp: new Date()
    };

    return cypherFeeManager.validateTransaction(transaction);
  }, [config.network, config.userAddress]);

  // Funções utilitárias
  const formatFeeAmount = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  }, []);

  const getFeePercentage = useCallback((): number => {
    return 0.20; // 0.20%
  }, []);

  const getRecipientAddress = useCallback((): string => {
    return cypherFeeManager.getFeeRecipientAddress(config.network);
  }, [config.network]);

  const getMinimumTransaction = useCallback((): number => {
    return 10; // $10 USD
  }, []);

  // Auto-calcular se configurado
  useEffect(() => {
    if (config.autoCalculate && calculatedFee === null) {
      // Inicializar com valores padrão para demonstração
      calculateFee(0, 'TOKEN', 0).catch(console.error);
    }
  }, [config.autoCalculate, calculatedFee, calculateFee]);

  return {
    // Estados
    calculatedFee,
    isValidTransaction,
    validationMessage,
    isCalculating,
    isCollecting,
    
    // Funções
    calculateFee,
    collectFee,
    validateTransaction,
    
    // Utilidades
    formatFeeAmount,
    getFeePercentage,
    getRecipientAddress,
    getMinimumTransaction
  };
}

// Hook para estatísticas de fees (apenas leitura)
export function useCypherFeeStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async (period?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (period) params.set('period', period);

      const response = await fetch(`/api/fees/stats?${params}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to load stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    reload: loadStats
  };
}

// Hook para controle de distribuição (admin)
export function useCypherFeeDistribution() {
  const [distributions, setDistributions] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDistributing, setIsDistributing] = useState(false);

  const loadDistributions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fees/distribute');
      const data = await response.json();

      if (data.success) {
        setDistributions(data.distributions);
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to load distributions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const distributeAll = useCallback(async (): Promise<boolean> => {
    try {
      setIsDistributing(true);
      
      const response = await fetch('/api/fees/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'distribute_all' })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadDistributions(); // Recarregar dados
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Distribution error:', error);
      return false;
    } finally {
      setIsDistributing(false);
    }
  }, [loadDistributions]);

  const distributeNetwork = useCallback(async (network: NetworkType): Promise<boolean> => {
    try {
      const response = await fetch('/api/fees/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'distribute_network', network })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadDistributions(); // Recarregar dados
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Network distribution error:', error);
      return false;
    }
  }, [loadDistributions]);

  useEffect(() => {
    loadDistributions();
  }, [loadDistributions]);

  return {
    distributions,
    config,
    loading,
    isDistributing,
    distributeAll,
    distributeNetwork,
    reload: loadDistributions
  };
}

export default useCypherFees;