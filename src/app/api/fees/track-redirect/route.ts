import { NextRequest, NextResponse } from 'next/server';

interface RedirectTrackingData {
  dex: string;
  network: string;
  tokenIn: string;
  tokenOut: string;
  amount: string;
  feePercentage: number;
  timestamp: string;
  userAgent: string;
  referrer: string;
  feeUSD?: number;
}

// In-memory storage for demo (in production, use a database)
let redirectLogs: RedirectTrackingData[] = [];

export async function POST(request: NextRequest) {
  try {
    const data: RedirectTrackingData = await request.json();
    
    // Validate required fields
    if (!data.dex || !data.network || !data.feePercentage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate fee in USD (estimativa - atualizado 2026-02-24)
    // TODO: Buscar preço real via /api/market/price em produção
    const amountValue = parseFloat(data.amount) || 0;
    const estimatedTokenPrice = data.network === 'bitcoin' ? 63500 : 1850;
    const feeUSD = (amountValue * estimatedTokenPrice * data.feePercentage) / 100;

    // Enhanced tracking data
    const trackingRecord = {
      ...data,
      id: Date.now().toString(),
      feeUSD,
      ip: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      origin: request.headers.get('origin') || 'unknown',
      processed: true
    };

    // Store the redirect log
    redirectLogs.push(trackingRecord);

    // Keep only last 1000 records to prevent memory issues
    if (redirectLogs.length > 1000) {
      redirectLogs = redirectLogs.slice(-1000);
    }

    console.log('💰 CYPHER Fee Redirect Tracked:', {
      dex: data.dex,
      network: data.network,
      fee: `${data.feePercentage}%`,
      feeUSD: feeUSD.toFixed(4),
      timestamp: data.timestamp
    });

    // In production, you would:
    // 1. Store in database
    // 2. Send to analytics service
    // 3. Update revenue tracking
    // 4. Trigger webhook notifications

    return NextResponse.json({
      success: true,
      trackingId: trackingRecord.id,
      fee: {
        percentage: data.feePercentage,
        usd: feeUSD,
        applied: true
      },
      redirect: {
        dex: data.dex,
        network: data.network,
        tracked: true
      }
    });

  } catch (error) {
    console.error('Error tracking redirect:', error);
    return NextResponse.json(
      { error: 'Failed to track redirect' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const dex = url.searchParams.get('dex');
    const network = url.searchParams.get('network');

    let filteredLogs = redirectLogs;

    // Apply filters
    if (dex) {
      filteredLogs = filteredLogs.filter(log => log.dex.toLowerCase() === dex.toLowerCase());
    }
    if (network) {
      filteredLogs = filteredLogs.filter(log => log.network.toLowerCase() === network.toLowerCase());
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    const results = filteredLogs.slice(0, limit);

    // Calculate statistics
    const stats = {
      totalRedirects: filteredLogs.length,
      totalFeeUSD: filteredLogs.reduce((sum, log) => sum + (log.feeUSD || 0), 0),
      topDex: getTopDex(filteredLogs),
      topNetwork: getTopNetwork(filteredLogs),
      averageFeeUSD: filteredLogs.length > 0 ? 
        filteredLogs.reduce((sum, log) => sum + (log.feeUSD || 0), 0) / filteredLogs.length : 0
    };

    return NextResponse.json({
      success: true,
      data: results,
      stats,
      pagination: {
        total: filteredLogs.length,
        returned: results.length,
        limit
      }
    });

  } catch (error) {
    console.error('Error fetching redirect logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch redirect logs' },
      { status: 500 }
    );
  }
}

function getTopDex(logs: any[]) {
  const dexCounts = logs.reduce((acc, log) => {
    acc[log.dex] = (acc[log.dex] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(dexCounts).reduce((a, b) => 
    dexCounts[a[0]] > dexCounts[b[0]] ? a : b
  )?.[0] || 'None';
}

function getTopNetwork(logs: any[]) {
  const networkCounts = logs.reduce((acc, log) => {
    acc[log.network] = (acc[log.network] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(networkCounts).reduce((a, b) => 
    networkCounts[a[0]] > networkCounts[b[0]] ? a : b
  )?.[0] || 'None';
}