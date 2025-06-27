/**
 * 💸 CYPHER FEE DISTRIBUTION API
 * Endpoint para gerenciar distribuição de taxas por rede
 */

import { NextRequest, NextResponse } from 'next/server';
import { cypherFeeDistributor } from '@/lib/feeDistribution';
import { cypherRevenueTracker } from '@/lib/revenueTracking';
import { NetworkType } from '@/lib/feeManager';

/**
 * GET /api/fees/distribute
 * Retorna status das distribuições
 */
export async function GET() {
  try {
    const distributions = cypherFeeDistributor.getAllDistributions();
    const stats = cypherFeeDistributor.getDistributionStats();
    const config = cypherFeeDistributor.getConfig();

    return NextResponse.json({
      success: true,
      distributions,
      stats,
      config,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ DISTRIBUTION GET API ERROR:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve distribution status' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fees/distribute
 * Executa distribuição manual de taxas
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, network, force = false } = body;

    let results: any[] = [];

    switch (action) {
      case 'distribute_all':
        // Distribui todas as taxas pendentes
        try {
          const distributionResults = await cypherFeeDistributor.distributeAllPendingFees();
          
          // Registrar distribuições no revenue tracker
          distributionResults.forEach(result => {
            cypherRevenueTracker.recordDistribution(result);
          });

          results = distributionResults;
          
          console.log('💸 MANUAL DISTRIBUTION COMPLETED:', {
            count: results.length,
            networks: results.map(r => r.network),
            totalAmount: results.reduce((sum, r) => sum + r.amount, 0)
          });

        } catch (error) {
          throw new Error(`Failed to distribute all fees: ${error}`);
        }
        break;

      case 'distribute_network':
        // Distribui taxa de uma rede específica
        if (!network) {
          return NextResponse.json(
            { success: false, error: 'Network is required for network distribution' },
            { status: 400 }
          );
        }

        try {
          let result;
          
          if (force) {
            result = await cypherFeeDistributor.forceDistributeNetwork(network as NetworkType);
          } else {
            result = await cypherFeeDistributor.distributeNetworkFees(network as NetworkType);
          }

          // Registrar no revenue tracker
          cypherRevenueTracker.recordDistribution(result);
          
          results = [result];

          console.log('💸 NETWORK DISTRIBUTION COMPLETED:', {
            network,
            amount: result.amount,
            force,
            txHash: result.txHash
          });

        } catch (error) {
          throw new Error(`Failed to distribute ${network} fees: ${error}`);
        }
        break;

      case 'update_config':
        // Atualiza configuração de distribuição
        const { config } = body;
        
        if (!config) {
          return NextResponse.json(
            { success: false, error: 'Config is required for config update' },
            { status: 400 }
          );
        }

        cypherFeeDistributor.updateConfig(config);
        
        return NextResponse.json({
          success: true,
          action: 'config_updated',
          config: cypherFeeDistributor.getConfig(),
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      results,
      count: results.length,
      totalAmount: results.reduce((sum, r) => sum + r.amount, 0),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ DISTRIBUTION POST API ERROR:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown distribution error' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/fees/distribute
 * Atualiza configurações de distribuição
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { minimumAmount, distributionFrequency, autoDistribution, gasOptimization } = body;

    // Validar dados de entrada
    const validationError = validateConfigUpdate(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // Atualizar configuração
    cypherFeeDistributor.updateConfig({
      minimumAmount,
      distributionFrequency,
      autoDistribution,
      gasOptimization
    });

    const updatedConfig = cypherFeeDistributor.getConfig();

    console.log('⚙️ DISTRIBUTION CONFIG UPDATED:', updatedConfig);

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ DISTRIBUTION CONFIG UPDATE ERROR:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update distribution configuration' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/fees/distribute
 * Cancela distribuições pendentes (se suportado)
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const network = searchParams.get('network') as NetworkType | null;

    // Por enquanto, apenas log da operação
    // Em implementação real, cancelaria transações pendentes
    console.log('🛑 DISTRIBUTION CANCELLATION REQUESTED:', {
      network: network || 'all',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Distribution cancellation logged',
      network: network || 'all',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ DISTRIBUTION CANCEL ERROR:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cancel distribution' 
      },
      { status: 500 }
    );
  }
}

/**
 * Valida dados de atualização de configuração
 */
function validateConfigUpdate(config: any): string | null {
  if (config.minimumAmount !== undefined) {
    if (typeof config.minimumAmount !== 'number' || config.minimumAmount < 0) {
      return 'minimumAmount must be a positive number';
    }
  }

  if (config.distributionFrequency !== undefined) {
    const validFrequencies = ['hourly', 'daily', 'weekly', 'manual'];
    if (!validFrequencies.includes(config.distributionFrequency)) {
      return `distributionFrequency must be one of: ${validFrequencies.join(', ')}`;
    }
  }

  if (config.autoDistribution !== undefined) {
    if (typeof config.autoDistribution !== 'boolean') {
      return 'autoDistribution must be a boolean';
    }
  }

  if (config.gasOptimization !== undefined) {
    if (typeof config.gasOptimization !== 'boolean') {
      return 'gasOptimization must be a boolean';
    }
  }

  return null;
}