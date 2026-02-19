import { NextRequest, NextResponse } from 'next/server';
import { FEE_RECIPIENTS, REVENUE_MONITORING } from '@/config/feeRecipients';
import { RevenueDataV3, DailyRevenueV3, TopTrader } from '@/types/quickTrade';
import { getFeeStats, getAllFeeRecords } from '@/lib/feeCollector';

// REMOVIDO: generateMockRevenue - Usamos apenas dados reais do feeCollector
// NO MOCK DATA - apenas estatísticas reais de fees coletadas

// Check if user is admin
const isAdmin = (walletAddress: string | null): boolean => {
  if (!walletAddress) return false;
  const normalized = walletAddress.toLowerCase();
  return REVENUE_MONITORING.ADMIN_WALLETS.some(w => w.toLowerCase() === normalized);
};

export async function GET(request: NextRequest) {
  try {
    // Get wallet address from query params or headers
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet') || 
                         request.headers.get('x-wallet-address');

    // Check admin access
    if (!isAdmin(walletAddress)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Get ONLY real fee stats from centralized collector - NO MOCK DATA
    const realFeeStats = await getFeeStats();
    const realFeeRecords = await getAllFeeRecords();

    // Return ONLY real data - NO MOCK ANALYTICS
    return NextResponse.json({
      success: true,
      data: {
        realTimeStats: realFeeStats,
        recentFeeRecords: realFeeRecords.slice(-50),
        feeRecipients: {
          evm: FEE_RECIPIENTS.EVM,
          solana: FEE_RECIPIENTS.SOLANA,
          bitcoin: FEE_RECIPIENTS.BITCOIN,
        },
        feeCollectionMethods: {
          thorchain: 'Native affiliate fee - THORChain deducts and sends to affiliate address',
          jupiter: 'Native platform fee - Jupiter deducts and sends to fee account',
          evm_dex: 'Native referrer fee - 1inch/Paraswap deducts and sends to referrer address',
          magiceden: 'PSBT fee output - included in Bitcoin transaction',
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Revenue API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch revenue data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get wallet address and action
    const body = await request.json();
    const { wallet, action, params } = body;

    // Check admin access
    if (!isAdmin(wallet)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Handle different admin actions
    switch (action) {
      case 'export':
        // Export REAL revenue data only
        const realFeeStats = await getFeeStats();
        const realFeeRecords = await getAllFeeRecords();
        const exportData = {
          format: params?.format || 'csv',
          dateRange: params?.dateRange || 'last30days',
          data: {
            stats: realFeeStats,
            records: realFeeRecords
          },
          exportedAt: new Date().toISOString(),
          exportedBy: wallet
        };
        
        return NextResponse.json({
          success: true,
          data: exportData,
          message: 'Revenue data exported successfully'
        });

      case 'withdraw':
        // Process withdrawal (mock)
        const withdrawalAmount = params?.amount || 0;
        const withdrawalChain = params?.chain || 'ethereum';
        
        if (withdrawalAmount < REVENUE_MONITORING.MIN_WITHDRAWAL[withdrawalChain as keyof typeof REVENUE_MONITORING.MIN_WITHDRAWAL]) {
          return NextResponse.json(
            { error: `Minimum withdrawal amount not met for ${withdrawalChain}` },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            withdrawalId: `wd_${Date.now()}`,
            amount: withdrawalAmount,
            chain: withdrawalChain,
            status: 'processing',
            estimatedTime: '10-30 minutes',
            destinationWallet: wallet
          },
          message: 'Withdrawal initiated successfully'
        });

      case 'distribute':
        // Distribute revenue according to preset percentages
        const totalToDistribute = params?.amount || 0;
        const distribution = Object.entries(REVENUE_MONITORING.DISTRIBUTION).map(([category, percentage]) => ({
          category,
          percentage: percentage * 100,
          amount: totalToDistribute * percentage
        }));

        return NextResponse.json({
          success: true,
          data: {
            distributionId: `dist_${Date.now()}`,
            totalAmount: totalToDistribute,
            distribution,
            status: 'pending_approval',
            initiatedBy: wallet
          },
          message: 'Distribution proposal created'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Revenue POST Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}