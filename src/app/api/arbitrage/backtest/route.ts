/**
 * Arbitrage Backtest API
 * Run historical backtests on arbitrage strategies
 */

import { NextRequest, NextResponse } from 'next/server';
import { backtestEngine } from '@/services/arbitrage/BacktestEngine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface BacktestRequest {
  strategy: 'cex-dex' | 'triangular' | 'smc' | 'statistical';
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  feePercent: number;
  minSpreadPercent?: number;
  minProfitPercent?: number;
  orderBlockStrength?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: BacktestRequest = await request.json();

    // Validate input
    if (!body.strategy || !body.symbol || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: strategy, symbol, startDate, endDate' },
        { status: 400 }
      );
    }

    if (!body.initialCapital || body.initialCapital <= 0) {
      return NextResponse.json(
        { error: 'Initial capital must be greater than 0' },
        { status: 400 }
      );
    }

    // Parse dates
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Limit backtest period to 1 year
    const maxPeriod = 365 * 24 * 60 * 60 * 1000; // 1 year
    if (endDate.getTime() - startDate.getTime() > maxPeriod) {
      return NextResponse.json(
        { error: 'Backtest period cannot exceed 1 year' },
        { status: 400 }
      );
    }

    // Run backtest
    const result = await backtestEngine.runBacktest({
      strategy: body.strategy,
      symbol: body.symbol,
      startDate,
      endDate,
      initialCapital: body.initialCapital,
      feePercent: body.feePercent || 0.1,
      minSpreadPercent: body.minSpreadPercent,
      minProfitPercent: body.minProfitPercent,
      orderBlockStrength: body.orderBlockStrength
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Backtest API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // TODO: Fetch historical backtest results from database
    // For now, return empty array

    return NextResponse.json({
      backtests: [],
      message: 'Historical backtests feature coming soon'
    });
  } catch (error: any) {
    console.error('Get backtests error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
