/**
 * Performance Analytics API
 * Returns institutional-grade trading metrics from real execution history
 * GET /api/arbitrage/performance?strategy=all&period=24h
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/database/db-service';
import { cache } from '@/lib/cache/redis.config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const strategy = searchParams.get('strategy') || 'all';
    const period = searchParams.get('period') || '24h';

    // Cache key
    const cacheKey = `performance:${strategy}:${period}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      try {
        return NextResponse.json(JSON.parse(cached));
      } catch (e) {
        // Invalid cache, continue
      }
    }

    // Calculate time range
    const periodMap: Record<string, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      'all': 365 * 24 * 60 * 60 * 1000 // 1 year
    };

    const periodMs = periodMap[period] || periodMap['24h'];
    const startTime = new Date(Date.now() - periodMs);

    // Fetch real execution data from database using Supabase client
    const client = dbService.getClient();
    let queryBuilder = client
      .from('arbitrage_executions')
      .select('id, strategy, profit_usd, profit_percent, executed_at, status')
      .gte('executed_at', startTime.toISOString())
      .order('executed_at', { ascending: false })
      .limit(1000);

    if (strategy !== 'all') {
      queryBuilder = queryBuilder.eq('strategy', strategy);
    }

    const { data: executions, error: queryError } = await queryBuilder;
    if (queryError) {
      console.warn('Performance query error:', queryError.message);
      throw queryError;
    }

    // If no executions found, return zero metrics
    if (executions.length === 0) {
      const emptyMetrics = {
        strategy,
        period,
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        maxDrawdown: 0,
        currentDrawdown: 0,
        winRate: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        totalTrades: 0,
        totalProfit: 0,
        returnPercent: 0,
        volatility: 0,
        recoveryTime: 0,
        message: 'No execution history found for this period'
      };

      await cache.setex(cacheKey, 60, JSON.stringify(emptyMetrics));
      return NextResponse.json(emptyMetrics);
    }

    // Calculate performance metrics from REAL data
    const profits = executions.map((e: any) => parseFloat(e.profit_usd) || 0);
    const profitPercents = executions.map((e: any) => parseFloat(e.profit_percent) || 0);

    const totalTrades = executions.length;
    const totalProfit = profits.reduce((sum, p) => sum + p, 0);
    const winningTrades = profits.filter(p => p > 0);
    const losingTrades = profits.filter(p => p < 0);

    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, p) => sum + p, 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, p) => sum + p, 0) / losingTrades.length)
      : 0;

    const grossProfit = winningTrades.reduce((sum, p) => sum + p, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, p) => sum + p, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    // Calculate return percent
    const initialCapital = 10000; // Assume $10k starting capital
    const returnPercent = (totalProfit / initialCapital) * 100;

    // Calculate volatility (standard deviation of returns)
    const avgReturn = profitPercents.reduce((sum, p) => sum + p, 0) / profitPercents.length;
    const variance = profitPercents.reduce((sum, p) => sum + Math.pow(p - avgReturn, 2), 0) / profitPercents.length;
    const volatility = Math.sqrt(variance);

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    let runningProfit = 0;

    profits.forEach(profit => {
      runningProfit += profit;
      if (runningProfit > peak) {
        peak = runningProfit;
      }
      const drawdown = ((peak - runningProfit) / Math.max(peak, 1)) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    currentDrawdown = peak > 0 ? ((peak - runningProfit) / peak) * 100 : 0;

    // Calculate Sharpe Ratio (assuming risk-free rate = 0)
    const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;

    // Calculate Sortino Ratio (only downside volatility)
    const downside = profitPercents.filter(p => p < 0);
    const downsideVariance = downside.length > 0
      ? downside.reduce((sum, p) => sum + Math.pow(p - avgReturn, 2), 0) / downside.length
      : 0;
    const downsideVolatility = Math.sqrt(downsideVariance);
    const sortinoRatio = downsideVolatility > 0 ? avgReturn / downsideVolatility : 0;

    // Calculate Calmar Ratio
    const calmarRatio = maxDrawdown > 0 ? returnPercent / maxDrawdown : 0;

    // Recovery time (days to recover from max drawdown) - simplified
    const recoveryTime = maxDrawdown > 5 ? Math.round(maxDrawdown / 2) : 0;

    const metrics = {
      strategy,
      period,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      sortinoRatio: Math.round(sortinoRatio * 100) / 100,
      calmarRatio: Math.round(calmarRatio * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      currentDrawdown: Math.round(currentDrawdown * 100) / 100,
      winRate: Math.round(winRate * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      totalTrades,
      totalProfit: Math.round(totalProfit * 100) / 100,
      returnPercent: Math.round(returnPercent * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      recoveryTime
    };

    // Cache for 60 seconds
    await cache.setex(cacheKey, 60, JSON.stringify(metrics));

    return NextResponse.json(metrics);

  } catch (error) {
    // Database may not have the arbitrage_executions table — return empty metrics
    console.warn('Performance API: DB unavailable, returning empty metrics', error instanceof Error ? error.message : error);
    const { searchParams: sp } = new URL(request.url);
    return NextResponse.json({
      strategy: sp.get('strategy') || 'all',
      period: sp.get('period') || '24h',
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      totalTrades: 0,
      totalProfit: 0,
      returnPercent: 0,
      volatility: 0,
      recoveryTime: 0,
      message: 'No execution history available'
    });
  }
}
