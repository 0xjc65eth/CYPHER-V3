import { NextRequest, NextResponse } from 'next/server';


interface Transaction {
  txid: string;
  date: string;
  type: 'buy' | 'sell' | 'transfer' | 'inscription';
  amount: number;
  asset: string;
  price: number;
  totalValue: number;
  fee: number;
  confirmations: number;
  from?: string;
  to?: string;
  status: 'confirmed' | 'pending';
  inscriptionId?: string;
  runeId?: string;
}

// Helper para calcular o valor da transação para um endereço específico
function calculateTxValue(tx: any, address: string): { amount: number; type: string } {
  let amountIn = 0;
  let amountOut = 0;

  // Calcular entradas
  (tx.vin || []).forEach((input: any) => {
    if (input.prevout?.scriptpubkey_address === address) {
      amountOut += input.prevout.value || 0;
    }
  });

  // Calcular saídas
  (tx.vout || []).forEach((output: any) => {
    if (output.scriptpubkey_address === address) {
      amountIn += output.value || 0;
    }
  });

  const netAmount = amountIn - amountOut;
  
  return {
    amount: Math.abs(netAmount),
    type: netAmount > 0 ? 'buy' : netAmount < 0 ? 'sell' : 'transfer'
  };
}

async function getTransactions(address: string): Promise<Transaction[]> {
  try {
    console.log('📊 Fetching REAL transactions for:', address);
    
    const transactions: Transaction[] = [];
    
    // 1. Buscar transações do Blockstream
    try {
      const blockstreamResponse = await fetch(
        `https://blockstream.info/api/address/${address}/txs`,
        { signal: AbortSignal.timeout(15000) }
      );
      
      if (blockstreamResponse.ok) {
        const blockstreamTxs = await blockstreamResponse.json();
        console.log('💸 Blockstream transactions found:', blockstreamTxs.length);
        
        // Buscar preço atual do Bitcoin
        const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const priceData = await priceResponse.json();
        const currentBtcPrice = priceData.bitcoin?.usd || 110000;
        
        // Processar transações
        for (const tx of blockstreamTxs.slice(0, 50)) { // Limitar a 50 transações
          const { amount, type } = calculateTxValue(tx, address);
          
          if (amount > 0) {
            // Estimar preço histórico (simplificado - em produção usaria API de preço histórico)
            const txDate = new Date(tx.status.block_time * 1000);
            const daysAgo = (Date.now() - txDate.getTime()) / (1000 * 60 * 60 * 24);
            const estimatedPrice = currentBtcPrice * (1 - (daysAgo * 0.001)); // Aproximação simples
            
            transactions.push({
              txid: tx.txid,
              date: txDate.toISOString(),
              type: type as 'buy' | 'sell' | 'transfer',
              amount: amount / 100000000, // Converter satoshis para BTC
              asset: 'BTC',
              price: estimatedPrice,
              totalValue: (amount / 100000000) * estimatedPrice,
              fee: tx.fee || 0,
              confirmations: tx.status.confirmed ? (tx.status.block_height || 0) : 0,
              status: tx.status.confirmed ? 'confirmed' : 'pending'
            });
          }
        }
      }
    } catch (err) {
      console.warn('Blockstream API error:', err);
    }
    
    // 2. Buscar transações do Mempool.space (fallback)
    if (transactions.length === 0) {
      try {
        const mempoolResponse = await fetch(
          `https://mempool.space/api/address/${address}/txs`,
          { signal: AbortSignal.timeout(15000) }
        );
        
        if (mempoolResponse.ok) {
          const mempoolTxs = await mempoolResponse.json();
          console.log('💸 Mempool.space transactions found:', mempoolTxs.length);
          
          // Processar de forma similar ao Blockstream
          for (const tx of mempoolTxs.slice(0, 50)) {
            const { amount, type } = calculateTxValue(tx, address);
            
            if (amount > 0) {
              const txDate = new Date(tx.status?.block_time ? tx.status.block_time * 1000 : Date.now());
              
              transactions.push({
                txid: tx.txid,
                date: txDate.toISOString(),
                type: type as 'buy' | 'sell' | 'transfer',
                amount: amount / 100000000,
                asset: 'BTC',
                price: 110000, // Preço atual como fallback
                totalValue: (amount / 100000000) * 110000,
                fee: tx.fee || 0,
                confirmations: tx.status?.confirmed ? 1 : 0,
                status: tx.status?.confirmed ? 'confirmed' : 'pending'
              });
            }
          }
        }
      } catch (err) {
        console.warn('Mempool.space API error:', err);
      }
    }
    
    // 3. Buscar transações de Ordinals (se houver)
    try {
      const hiroResponse = await fetch(
        `https://api.hiro.so/ordinals/v1/inscriptions?address=${address}&limit=20`,
        { signal: AbortSignal.timeout(10000) }
      );
      
      if (hiroResponse.ok) {
        const hiroData = await hiroResponse.json();
        console.log('🎨 Ordinals transactions found:', hiroData.results?.length || 0);
        
        // Adicionar transações de inscrições
        (hiroData.results || []).forEach((inscription: any) => {
          if (inscription.genesis_tx_id) {
            transactions.push({
              txid: inscription.genesis_tx_id,
              date: new Date(inscription.genesis_timestamp || Date.now()).toISOString(),
              type: 'inscription',
              amount: 0.00001, // Taxa de inscrição típica
              asset: 'ORDINAL',
              price: 0,
              totalValue: inscription.value || 10000,
              fee: inscription.genesis_fee || 1000,
              confirmations: 1,
              status: 'confirmed',
              inscriptionId: inscription.id
            });
          }
        });
      }
    } catch (err) {
      console.warn('Hiro Ordinals API error:', err);
    }
    
    // Ordenar transações por data (mais recentes primeiro)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    console.log('📊 Total transactions processed:', transactions.length);
    
    return transactions;
    
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!address) {
      return NextResponse.json({
        success: false,
        error: 'Bitcoin address is required'
      }, { status: 400 });
    }

    // Validate Bitcoin address format
    if (!address.match(/^(bc1|[13]|tb1|[mn2])[a-zA-HJ-NP-Z0-9]{25,62}$/)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Bitcoin address format'
      }, { status: 400 });
    }

    const transactions = await getTransactions(address);
    
    // Paginar resultados
    const paginatedTxs = transactions.slice(offset, offset + limit);
    
    // Calcular estatísticas
    const stats = {
      totalTransactions: transactions.length,
      totalBought: transactions
        .filter(tx => tx.type === 'buy')
        .reduce((sum, tx) => sum + tx.amount, 0),
      totalSold: transactions
        .filter(tx => tx.type === 'sell')
        .reduce((sum, tx) => sum + tx.amount, 0),
      totalFees: transactions
        .reduce((sum, tx) => sum + tx.fee, 0),
      inscriptionCount: transactions
        .filter(tx => tx.type === 'inscription').length
    };

    return NextResponse.json({
      success: true,
      data: {
        transactions: paginatedTxs,
        stats,
        pagination: {
          total: transactions.length,
          limit,
          offset,
          hasMore: offset + limit < transactions.length
        }
      },
      debug: {
        address,
        timestamp: new Date().toISOString(),
        source: 'Real blockchain data from Blockstream, Mempool.space, Hiro',
        note: 'Transaction history with buy/sell classification and inscriptions'
      }
    });

  } catch (error) {
    console.error('❌ Transactions API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}