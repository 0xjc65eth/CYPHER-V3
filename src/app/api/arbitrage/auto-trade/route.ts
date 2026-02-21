import { NextRequest, NextResponse } from 'next/server';
import {
  tradeExecutor,
  type TradingMode,
  type RiskConfig,
} from '@/services/arbitrage/TradeExecutor';

export async function GET() {
  try {
    const state = tradeExecutor.getState();
    const history = tradeExecutor.getHistory(20);

    return NextResponse.json({
      success: true,
      running: state.running,
      mode: state.mode,
      config: state.config,
      stats: {
        activeTrades: state.activeTrades,
        todayPnL: parseFloat(state.todayPnL.toFixed(2)),
        todayTradeCount: state.todayTradeCount,
        lastTradeAt: state.lastTradeAt,
      },
      recentTrades: history.map((t) => ({
        id: t.id,
        pair: t.pair,
        mode: t.mode,
        buyExchange: t.buyExchange,
        sellExchange: t.sellExchange,
        buyPrice: t.buyPrice,
        sellPrice: t.sellPrice,
        amountUSD: parseFloat(t.amountUSD.toFixed(2)),
        netProfit: parseFloat(t.netProfit.toFixed(2)),
        netProfitPercent: parseFloat(t.netProfitPercent.toFixed(4)),
        status: t.status,
        error: t.error,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
      })),
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get auto-trade status',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, mode, config } = body as {
      action: string;
      mode?: TradingMode;
      config?: Partial<RiskConfig>;
    };

    switch (action) {
      case 'start': {
        const tradingMode: TradingMode = mode || 'paper';
        tradeExecutor.start(tradingMode, config);
        return NextResponse.json({
          success: true,
          message: `Auto-trader started in ${tradingMode} mode`,
          state: tradeExecutor.getState(),
        });
      }

      case 'stop': {
        tradeExecutor.stop();
        return NextResponse.json({
          success: true,
          message: 'Auto-trader stopped',
          state: tradeExecutor.getState(),
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Invalid action: ${action}. Use 'start' or 'stop'.`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process auto-trade action',
      },
      { status: 500 }
    );
  }
}
