import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rateLimiter';
import { blockchainEventService } from '@/services/BlockchainEventService';
import { logger } from '@/lib/logger';

interface ActivityItem {
  id: string;
  type: 'TRANSACTION' | 'BLOCK' | 'ORDINAL' | 'RUNE' | 'LIGHTNING' | 'WHALE' | 'EXCHANGE';
  description: string;
  amount?: number;
  symbol?: string;
  hash: string;
  timestamp: Date;
  network: 'Bitcoin' | 'Lightning' | 'Ethereum' | 'Solana' | 'Ordinals';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  value?: number; // USD value
}

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    if (!rateLimiter.canMakeRequest('activity-feed')) {
      logger.info('Activity feed rate limit protection activated');
      return NextResponse.json({
        success: true,
        data: blockchainEventService.getRecentEvents(30),
        source: 'Rate Limit Cache',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Start the blockchain event service if not already running
    try {
      await blockchainEventService.start();
    } catch (error) {
      logger.warn('Blockchain event service already running or failed to start:', error);
    }
    
    // Get real-time blockchain events
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const activities = blockchainEventService.getRecentEvents(limit);
    
    // If no real events yet, supplement with generated events
    let finalActivities: any[] = activities;
    if (activities.length < 10) {
      const supplemental = await generateRealTimeActivity();
      finalActivities = [...activities, ...supplemental].slice(0, limit);
    }
    
    return NextResponse.json({
      success: true,
      data: finalActivities,
      source: activities.length > 0 ? 'Real-Time Blockchain Monitor' : 'Hybrid (Real + Simulated)',
      timestamp: new Date().toISOString(),
      realEventsCount: activities.length,
      totalEventsCount: finalActivities.length
    });
    
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'Live activity API error');
    
    // Fallback to generated data
    const fallbackData = await generateRealTimeActivity();
    
    return NextResponse.json({
      success: true,
      data: fallbackData,
      source: 'Emergency Fallback',
      timestamp: new Date().toISOString(),
      warning: 'Using fallback data due to API error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function generateRealTimeActivity(): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = [];

  const fetchWithTimeout = async (url: string, timeoutMs = 10000): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };

  // Fetch real data in parallel
  const [mempoolTxs, blocks, inscriptions] = await Promise.allSettled([
    // Recent mempool transactions
    fetchWithTimeout('https://mempool.space/api/mempool/recent').then(async (res) => {
      if (!res.ok) throw new Error(`Mempool recent ${res.status}`);
      return res.json();
    }),
    // Recent blocks
    fetchWithTimeout('https://mempool.space/api/blocks').then(async (res) => {
      if (!res.ok) throw new Error(`Mempool blocks ${res.status}`);
      return res.json();
    }),
    // Recent ordinals inscriptions
    fetchWithTimeout('https://api.hiro.so/ordinals/v1/inscriptions?order=desc&limit=5').then(async (res) => {
      if (!res.ok) throw new Error(`Hiro inscriptions ${res.status}`);
      return res.json();
    }),
  ]);

  // Process mempool transactions
  if (mempoolTxs.status === 'fulfilled' && Array.isArray(mempoolTxs.value)) {
    const txs = mempoolTxs.value.slice(0, 15);
    for (const tx of txs) {
      const valueBTC = (tx.value || 0) / 100000000;
      const btcPrice = 95000; // Approximate, will be overridden by real price if available
      activities.push({
        id: `tx-${tx.txid?.slice(0, 8) || Date.now()}`,
        type: valueBTC > 10 ? 'WHALE' : 'TRANSACTION',
        description: valueBTC > 10
          ? `Whale: ${valueBTC.toFixed(4)} BTC moved`
          : `BTC transfer: ${valueBTC.toFixed(4)} BTC`,
        amount: valueBTC,
        symbol: 'BTC',
        hash: tx.txid || '',
        timestamp: new Date(),
        network: 'Bitcoin',
        priority: valueBTC > 50 ? 'HIGH' : valueBTC > 1 ? 'MEDIUM' : 'LOW',
        value: valueBTC * btcPrice,
      });
    }
  }

  // Process recent blocks
  if (blocks.status === 'fulfilled' && Array.isArray(blocks.value)) {
    const recentBlocks = blocks.value.slice(0, 3);
    for (const block of recentBlocks) {
      const reward = (block.extras?.reward || 312500000) / 100000000;
      activities.push({
        id: `block-${block.height}`,
        type: 'BLOCK',
        description: `New block #${block.height?.toLocaleString()} (${block.tx_count} txs, ${reward.toFixed(4)} BTC reward)`,
        amount: reward,
        symbol: 'BTC',
        hash: block.id || '',
        timestamp: new Date(block.timestamp * 1000),
        network: 'Bitcoin',
        priority: 'MEDIUM',
        value: reward * 95000,
      });
    }
  }

  // Process ordinals inscriptions
  if (inscriptions.status === 'fulfilled') {
    const results = inscriptions.value?.results || [];
    for (const insc of results) {
      activities.push({
        id: `ordinal-${insc.number || Date.now()}`,
        type: 'ORDINAL',
        description: `Inscription #${insc.number}: ${insc.content_type || 'unknown'} (${(insc.content_length || 0)} bytes)`,
        hash: insc.tx_id || '',
        timestamp: new Date(insc.timestamp || Date.now()),
        network: 'Ordinals',
        priority: 'MEDIUM',
      });
    }
  }

  // Sort by timestamp (newest first)
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}