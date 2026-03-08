import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 60, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      'https://api.blockchair.com/bitcoin/transactions?q=output_total(50000000000..)&s=time(desc)&limit=10',
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      // Fallback: use mempool.space recent blocks to find large txs
      try {
        const mempoolRes = await fetch('https://mempool.space/api/blocks/tip/height');
        if (mempoolRes.ok) {
          const height = await mempoolRes.json();
          const blockRes = await fetch(`https://mempool.space/api/block-height/${height}`);
          if (blockRes.ok) {
            const blockHash = await blockRes.text();
            const txsRes = await fetch(`https://mempool.space/api/block/${blockHash}/txs`);
            if (txsRes.ok) {
              const blockTxs = await txsRes.json();
              const largeTxs = blockTxs
                .filter((tx: Record<string, unknown>) => {
                  const vout = tx.vout as Array<{ value: number }> || [];
                  const total = vout.reduce((s: number, o: { value: number }) => s + (o.value || 0), 0);
                  return total > 100000000; // > 1 BTC
                })
                .slice(0, 10)
                .map((tx: Record<string, unknown>) => {
                  const vout = tx.vout as Array<{ value: number }> || [];
                  const total = vout.reduce((s: number, o: { value: number }) => s + (o.value || 0), 0);
                  return {
                    hash: tx.txid,
                    time: tx.status && (tx.status as Record<string, unknown>).block_time ? new Date(Number((tx.status as Record<string, unknown>).block_time) * 1000).toISOString() : null,
                    inputTotal: null,
                    outputTotal: total / 1e8,
                    fee: tx.fee ? Number(tx.fee) / 1e8 : null,
                    blockId: height,
                  };
                });
              return NextResponse.json({
                transactions: largeTxs, count: largeTxs.length,
                threshold: '1 BTC', timestamp: Date.now(), source: 'mempool_fallback',
              }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } });
            }
          }
        }
      } catch { /* ignore fallback error */ }
      return NextResponse.json(
        { error: `Blockchair API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const txs = data.data || [];

    const transactions = txs.map((tx: Record<string, unknown>) => ({
      hash: tx.hash,
      time: tx.time,
      inputTotal: tx.input_total ? Number(tx.input_total) / 1e8 : null,
      outputTotal: tx.output_total ? Number(tx.output_total) / 1e8 : null,
      fee: tx.fee ? Number(tx.fee) / 1e8 : null,
      blockId: tx.block_id,
    }));

    return NextResponse.json(
      {
        transactions,
        count: transactions.length,
        threshold: '500 BTC',
        timestamp: Date.now(),
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch whale transactions' }, { status: 500 });
  }
}
