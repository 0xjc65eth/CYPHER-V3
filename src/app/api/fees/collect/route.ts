/**
 * 💰 CYPHER FEE COLLECTION API
 * Endpoint para processamento e coleta de taxas 0.20%
 * Integra com o sistema de fee management
 */

import { NextRequest, NextResponse } from 'next/server';
import { cypherFeeManager, Transaction, NetworkType } from '@/lib/feeManager';
import { cypherFeeDistributor } from '@/lib/feeDistribution';
import { cypherRevenueTracker } from '@/lib/revenueTracking';

// Interface para request de coleta de taxa
interface FeeCollectionRequest {
  transactionId: string;
  network: NetworkType;
  amount: number;
  tokenSymbol: string;
  usdValue: number;
  userAddress: string;
  platform?: string;
  txHash?: string;
}

// Interface para response de coleta
interface FeeCollectionResponse {
  success: boolean;
  transactionId: string;
  fee: {
    amount: number;
    amountUSD: number;
    percentage: number;
    recipientAddress: string;
    network: NetworkType;
  };
  collection?: {
    status: 'collected' | 'pending' | 'failed';
    txHash?: string;
    timestamp: Date;
  };
  error?: string;
}

/**
 * POST /api/fees/collect
 * Processa e coleta taxa de uma transação
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication / CSRF
    if (!validateAuthentication(request)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: invalid origin' },
        { status: 403 }
      );
    }

    const body: FeeCollectionRequest = await request.json();

    // Validar dados de entrada
    const validation = validateRequest(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error 
        },
        { status: 400 }
      );
    }

    // Criar transação para processamento
    const transaction: Transaction = {
      id: body.transactionId,
      network: body.network,
      amount: body.amount,
      tokenSymbol: body.tokenSymbol,
      usdValue: body.usdValue,
      userAddress: body.userAddress,
      timestamp: new Date(),
      txHash: body.txHash,
      platform: body.platform
    };

    // Processar transação e calcular taxa
    const { calculatedFee, validation: transactionValidation } = 
      await cypherFeeManager.processTransaction(transaction);

    if (!transactionValidation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: transactionValidation.reason 
        },
        { status: 400 }
      );
    }

    // Simular coleta de taxa
    const collectionResult = await cypherFeeManager.simulateFeeCollection(
      calculatedFee,
      body.userAddress
    );

    // Registrar no sistema de revenue tracking
    const revenueEntry = await cypherRevenueTracker.recordRevenue(
      transaction,
      calculatedFee,
      collectionResult.txHash
    );

    // Atualizar status no revenue tracker
    cypherRevenueTracker.updateRevenueStatus(
      revenueEntry.id,
      collectionResult.success ? 'collected' : 'failed',
      collectionResult.txHash
    );

    // Adicionar ao sistema de distribuição se coletado com sucesso
    if (collectionResult.success) {
      await cypherFeeDistributor.addCollectedFee(calculatedFee);
    }

    // Preparar response
    const response: FeeCollectionResponse = {
      success: collectionResult.success,
      transactionId: body.transactionId,
      fee: {
        amount: calculatedFee.feeAmount,
        amountUSD: calculatedFee.feeAmountUSD,
        percentage: calculatedFee.feePercentage,
        recipientAddress: calculatedFee.recipientAddress,
        network: calculatedFee.network
      },
      collection: {
        status: collectionResult.success ? 'collected' : 'failed',
        txHash: collectionResult.txHash,
        timestamp: collectionResult.timestamp
      }
    };

    if (!collectionResult.success) {
      response.error = collectionResult.error;
    }

    // Fee collection operation logged via response

    return NextResponse.json(response, { 
      status: collectionResult.success ? 200 : 500 
    });

  } catch (error) {
    console.error('❌ FEE COLLECTION API ERROR:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during fee collection' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/fees/collect
 * Retorna informações sobre o sistema de coleta de taxas
 */
export async function GET() {
  try {
    const feeStats = await cypherFeeManager.getFeeStats();
    const distributionStats = cypherFeeDistributor.getDistributionStats();
    const revenueStats = cypherRevenueTracker.generateStats();

    return NextResponse.json({
      success: true,
      system: {
        feePercentage: 0.20,
        minimumTransaction: 10,
        supportedNetworks: [
          'bitcoin',
          'ethereum',
          'polygon',
          'bsc',
          'arbitrum',
          'optimism',
          'base',
          'avalanche',
          'solana'
        ]
      },
      stats: {
        fees: feeStats,
        distribution: distributionStats,
        revenue: {
          totalRevenue: revenueStats.totalRevenue,
          totalTransactions: revenueStats.totalTransactions,
          averageValue: revenueStats.averageTransactionValue,
          growth: revenueStats.revenueGrowth
        }
      },
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ FEE STATS API ERROR:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve fee statistics' 
      },
      { status: 500 }
    );
  }
}

/**
 * Valida dados do request de coleta
 */
function validateRequest(body: any): { isValid: boolean; error?: string } {
  if (!body.transactionId) {
    return { isValid: false, error: 'Transaction ID is required' };
  }

  if (!body.network) {
    return { isValid: false, error: 'Network is required' };
  }

  if (!cypherFeeManager.isNetworkSupported(body.network)) {
    return { isValid: false, error: `Network ${body.network} is not supported` };
  }

  if (typeof body.amount !== 'number' || body.amount <= 0) {
    return { isValid: false, error: 'Amount must be a positive number' };
  }

  if (typeof body.usdValue !== 'number' || body.usdValue <= 0) {
    return { isValid: false, error: 'USD value must be a positive number' };
  }

  if (!body.userAddress) {
    return { isValid: false, error: 'User address is required' };
  }

  if (!body.tokenSymbol) {
    return { isValid: false, error: 'Token symbol is required' };
  }

  return { isValid: true };
}

/**
 * Middleware para validação de rate limiting (futuro)
 */
function validateRateLimit(userAddress: string): boolean {
  // Implementar rate limiting por endereço no futuro
  return true;
}

/**
 * Validate request authentication via Origin/CSRF check
 */
function validateAuthentication(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  const allowedOrigins = [
    'http://localhost:4444',
    'https://localhost:4444',
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ].filter(Boolean) as string[];

  if (origin) {
    return allowedOrigins.includes(origin);
  }

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return allowedOrigins.includes(refererOrigin);
    } catch {
      return false;
    }
  }

  // Check Sec-Fetch-Site for modern browsers
  const fetchSite = request.headers.get('sec-fetch-site');
  return fetchSite === 'same-origin' || fetchSite === 'none';
}