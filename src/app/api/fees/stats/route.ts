/**
 * 📊 CYPHER FEE STATISTICS API
 * Endpoint para estatísticas e relatórios de taxas
 */

import { NextRequest, NextResponse } from 'next/server';
import { cypherRevenueTracker } from '@/lib/revenueTracking';
import { cypherFeeDistributor } from '@/lib/feeDistribution';
import { NetworkType } from '@/lib/feeManager';
import { validateAdminAuth } from '@/lib/middleware/admin-auth';

/**
 * GET /api/fees/stats
 * Retorna estatísticas completas do sistema de taxas
 */
export async function GET(request: NextRequest) {
  try {
    const auth = validateAdminAuth(request);
    if (!auth.ok) return auth.response;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period');
    const network = searchParams.get('network') as NetworkType | null;

    // Definir período de análise
    let dateRange: { start: Date; end: Date } | undefined;
    
    if (period) {
      const now = new Date();
      const start = new Date();
      
      switch (period) {
        case '24h':
          start.setHours(now.getHours() - 24);
          break;
        case '7d':
          start.setDate(now.getDate() - 7);
          break;
        case '30d':
          start.setDate(now.getDate() - 30);
          break;
        case '90d':
          start.setDate(now.getDate() - 90);
          break;
        default:
          // Usar período padrão de 30 dias
          start.setDate(now.getDate() - 30);
      }
      
      dateRange = { start, end: now };
    }

    // Gerar estatísticas de revenue
    const revenueStats = cypherRevenueTracker.generateStats(dateRange);
    
    // Estatísticas de distribuição
    const distributionStats = cypherFeeDistributor.getDistributionStats();
    const allDistributions = cypherFeeDistributor.getAllDistributions();

    // Filtrar por rede se especificado
    let filteredDistributions = allDistributions;
    if (network) {
      filteredDistributions = allDistributions.filter(dist => dist.network === network);
    }

    // Preparar response
    const response = {
      success: true,
      period: period || 'all',
      network: network || 'all',
      stats: {
        revenue: {
          total: revenueStats.totalRevenue,
          transactions: revenueStats.totalTransactions,
          average: revenueStats.averageTransactionValue,
          growth: revenueStats.revenueGrowth,
          daily: revenueStats.dailyRevenue.slice(-30), // Últimos 30 dias
          monthly: revenueStats.monthlyRevenue.slice(-12) // Últimos 12 meses
        },
        distribution: {
          totalCollected: distributionStats.totalCollected,
          totalPending: distributionStats.totalPending,
          totalNetworks: distributionStats.totalNetworks,
          activeNetworks: distributionStats.activeNetworks,
          lastDistribution: distributionStats.lastDistribution
        },
        networks: filteredDistributions.map(dist => ({
          network: dist.network,
          totalCollected: dist.totalCollected,
          totalTransactions: dist.totalTransactions,
          pendingDistribution: dist.pendingDistribution,
          lastDistribution: dist.lastDistribution,
          status: dist.status,
          recipientAddress: dist.recipientAddress
        })),
        topNetworks: revenueStats.topNetworks.slice(0, 5)
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSource: 'cypher-revenue-tracker',
        version: '1.0.0'
      }
    };

    return NextResponse.json(response);

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
 * POST /api/fees/stats/export
 * Exporta dados para CSV
 */
export async function POST(request: NextRequest) {
  try {
    const auth = validateAdminAuth(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { format = 'csv', period, network } = body;

    // Definir critérios de busca
    const criteria: any = {};
    
    if (period) {
      const now = new Date();
      const start = new Date();
      
      switch (period) {
        case '24h':
          start.setHours(now.getHours() - 24);
          break;
        case '7d':
          start.setDate(now.getDate() - 7);
          break;
        case '30d':
          start.setDate(now.getDate() - 30);
          break;
        case '90d':
          start.setDate(now.getDate() - 90);
          break;
      }
      
      criteria.dateRange = { start, end: now };
    }

    if (network) {
      criteria.network = network;
    }

    // Buscar entradas
    const entries = cypherRevenueTracker.searchEntries(criteria);

    if (format === 'csv') {
      const csvData = cypherRevenueTracker.exportToCSV(entries);
      
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="cypher-fees-${Date.now()}.csv"`
        }
      });
    }

    // Formato JSON por padrão
    return NextResponse.json({
      success: true,
      data: entries,
      count: entries.length,
      exported: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ FEE EXPORT API ERROR:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to export fee data' 
      },
      { status: 500 }
    );
  }
}