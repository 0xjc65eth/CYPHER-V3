/**
 * Arbitrage Trade Execution API
 * Handles paper trading and real trade execution
 * POST /api/arbitrage/execute
 */

import { NextRequest, NextResponse } from 'next/server';
import { ccxtIntegration } from '@/services/arbitrage/CCXTIntegration';
import { dbService } from '@/lib/database/db-service';
import { cache } from '@/lib/cache/redis.config';

/** Validate admin bearer token for mutation endpoints */
function validateAdminToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7);
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret === 'changeme') return false;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, secret);
    return !!decoded?.adminId;
  } catch {
    return false;
  }
}

interface ExecuteTradeRequest {
  opportunityId?: string;
  buyExchange: string;
  sellExchange: string;
  symbol: string;
  amount: number;
  userWallet: string;
  mode: 'paper' | 'live'; // Default to paper for safety
}

interface ExecutionResult {
  id: string;
  status: 'pending' | 'buy_submitted' | 'buy_confirmed' | 'sell_submitted' | 'completed' | 'failed';
  buyTxHash?: string;
  sellTxHash?: string;
  actualProfit?: number;
  slippage?: number;
  errorMessage?: string;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  if (!validateAdminToken(request)) {
    return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }

  try {
    const body: ExecuteTradeRequest = await request.json();

    // Validate required fields
    if (!body.buyExchange || !body.sellExchange || !body.symbol || !body.amount || !body.userWallet) {
      return NextResponse.json(
        { error: 'Missing required fields: buyExchange, sellExchange, symbol, amount, userWallet' },
        { status: 400 }
      );
    }

    // Default to paper trading for safety
    const mode = body.mode || 'paper';

    // Validate exchanges are initialized
    const exchanges = ccxtIntegration.getExchanges();
    const buyExchangeExists = exchanges.find(e => e.id === body.buyExchange);
    const sellExchangeExists = exchanges.find(e => e.id === body.sellExchange);

    if (!buyExchangeExists || !sellExchangeExists) {
      return NextResponse.json(
        { error: 'One or both exchanges not supported or not initialized' },
        { status: 400 }
      );
    }

    // Get current prices to validate opportunity still exists
    const buyTicker = await ccxtIntegration.fetchTicker(body.buyExchange, body.symbol);
    const sellTicker = await ccxtIntegration.fetchTicker(body.sellExchange, body.symbol);

    if (!buyTicker || !sellTicker) {
      return NextResponse.json(
        { error: 'Unable to fetch current prices from one or both exchanges' },
        { status: 500 }
      );
    }

    // Calculate expected profit
    const buyPrice = buyTicker.ask ?? buyTicker.last ?? 0;
    const sellPrice = sellTicker.bid ?? sellTicker.last ?? 0;
    const spread = sellPrice - buyPrice;
    const spreadPercent = (spread / buyPrice) * 100;

    // Get fees
    const buyFee = ccxtIntegration.getExchangeFee(body.buyExchange, 'taker');
    const sellFee = ccxtIntegration.getExchangeFee(body.sellExchange, 'taker');

    const buyFeeAmount = body.amount * buyPrice * buyFee;
    const sellFeeAmount = body.amount * sellPrice * sellFee;
    const grossProfit = spread * body.amount;
    const netProfit = grossProfit - buyFeeAmount - sellFeeAmount;

    // Validate profitability
    if (netProfit <= 0) {
      return NextResponse.json(
        {
          error: 'Opportunity no longer profitable',
          details: {
            buyPrice,
            sellPrice,
            spread,
            spreadPercent,
            grossProfit,
            fees: buyFeeAmount + sellFeeAmount,
            netProfit
          }
        },
        { status: 400 }
      );
    }

    // Create execution record in database
    const executionId = crypto.randomUUID();
    const execution: ExecutionResult = {
      id: executionId,
      status: mode === 'paper' ? 'completed' : 'pending',
      actualProfit: mode === 'paper' ? netProfit : undefined,
      slippage: 0, // For paper trading, assume no slippage
      timestamp: Date.now()
    };

    // Insert into database
    try {
      const client = dbService.getClient();
      await client.from('arbitrage_executions').insert({
        id: executionId,
        opportunity_id: body.opportunityId || null,
        user_wallet: body.userWallet,
        amount: body.amount,
        status: execution.status,
        actual_profit: execution.actualProfit || null,
        slippage: execution.slippage,
        started_at: new Date().toISOString(),
        completed_at: mode === 'paper' ? new Date().toISOString() : null
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue even if DB insert fails - don't block execution
    }

    if (mode === 'paper') {
      // Paper trading: simulate execution
      return NextResponse.json({
        success: true,
        mode: 'paper',
        execution,
        message: 'Paper trade executed successfully',
        details: {
          buyExchange: body.buyExchange,
          sellExchange: body.sellExchange,
          symbol: body.symbol,
          amount: body.amount,
          buyPrice,
          sellPrice,
          spread,
          spreadPercent,
          grossProfit,
          fees: {
            buy: buyFeeAmount,
            sell: sellFeeAmount,
            total: buyFeeAmount + sellFeeAmount
          },
          netProfit
        }
      });
    } else {
      // Live trading: NOT IMPLEMENTED YET (requires API keys, 2FA, etc.)
      return NextResponse.json(
        {
          error: 'Live trading not yet implemented',
          message: 'For safety, live trading requires additional security measures (API keys, 2FA, risk limits)',
          suggestion: 'Use mode: "paper" for simulation'
        },
        { status: 501 }
      );
    }

  } catch (error) {
    console.error('Execute trade error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET: Fetch execution status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('id');
    const userWallet = searchParams.get('wallet');

    const client = dbService.getClient();

    if (executionId) {
      // Fetch specific execution
      const { data, error: fetchError } = await client
        .from('arbitrage_executions')
        .select('*')
        .eq('id', executionId)
        .single();

      if (fetchError || !data) {
        return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
      }

      return NextResponse.json({ execution: data });
    } else if (userWallet) {
      // Fetch user's executions
      const { data, error: fetchError } = await client
        .from('arbitrage_executions')
        .select('*')
        .eq('user_wallet', userWallet)
        .order('created_at', { ascending: false })
        .limit(50);

      return NextResponse.json({
        executions: data || [],
        count: data?.length || 0
      });
    } else {
      // Fetch recent executions (admin view)
      const { data, error: fetchError } = await client
        .from('arbitrage_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      return NextResponse.json({
        executions: data || [],
        count: data?.length || 0
      });
    }

  } catch (error) {
    console.error('GET executions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}
