import { NextRequest, NextResponse } from 'next/server';


interface OrdinalsData {
  inscriptions: any[];
  ordinals: any[];
  runes: any[];
  rareSats: any[];
  totalValue: number;
}

// Helper para fazer requests com retry
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000) // 10s timeout
      });
      if (response.ok) return response;
      console.warn(`API request failed (${response.status}):`, url);
    } catch (error) {
      console.warn(`API request error (attempt ${i + 1}/${retries}):`, url, error);
      if (i === retries - 1) throw error;
    }
  }
  return null;
}

async function getOrdinalsData(address: string): Promise<OrdinalsData> {
  try {
    console.log('🎨 Fetching REAL Ordinals/Runes data for:', address);
    
    let inscriptions: any[] = [];
    let ordinals: any[] = [];
    let runes: any[] = [];
    let rareSats: any[] = [];
    let totalValue = 0;

    // Parallel API calls para melhor performance
    const apiPromises: Promise<void>[] = [];

    // 1. HIRO API - Inscriptions (Free, no key needed)
    apiPromises.push(
      fetchWithRetry(`https://api.hiro.so/ordinals/v1/inscriptions?address=${address}&limit=60`)
        .then(async (response) => {
          if (response) {
            const data = await response.json();
            console.log('📜 Hiro Inscriptions found:', data.results?.length || 0);
            
            inscriptions = (data.results || []).map((inscription: any) => ({
              id: inscription.id,
              number: inscription.number,
              address: inscription.address,
              contentType: inscription.content_type,
              contentLength: inscription.content_length,
              location: inscription.location,
              genesis_address: inscription.genesis_address,
              genesis_block_height: inscription.genesis_block_height,
              genesis_timestamp: inscription.genesis_timestamp,
              value: inscription.value || 10000, // satoshis
              sat: inscription.sat_ordinal,
              sat_rarity: inscription.sat_rarity,
              content_url: `https://ordinals.com/content/${inscription.id}`
            }));
          }
        })
        .catch(err => console.warn('Hiro API error:', err))
    );

    // 2. ORDISCAN API - Inscriptions e Collections
    apiPromises.push(
      fetchWithRetry(`https://api.ordiscan.com/v1/address/${address}/inscriptions`)
        .then(async (response) => {
          if (response) {
            const data = await response.json();
            console.log('🖼️ Ordiscan Collections found:', data.data?.length || 0);
            
            // Processar collections
            const collections = data.data || [];
            ordinals = collections
              .filter((item: any) => item.collection_name)
              .map((item: any) => ({
                collection: item.collection_name || 'Unknown Collection',
                tokenId: item.inscription_number ? `#${item.inscription_number}` : '#???',
                name: item.name || `${item.collection_name} #${item.inscription_number}`,
                inscriptionId: item.inscription_id,
                inscriptionNumber: item.inscription_number,
                contentType: item.content_type,
                currentValue: item.listed_price || item.floor_price || 100000000, // satoshis
                floorPrice: item.floor_price || 0,
                lastSalePrice: item.last_sale_price || 0,
                rarity: item.rarity_rank ? 'Rare' : 'Common',
                attributes: item.attributes || [],
                image: `https://ordinals.com/content/${item.inscription_id}`,
                listed: item.listed || false,
                marketplace: item.marketplace || 'none'
              }));
          }
        })
        .catch(err => console.warn('Ordiscan API error:', err))
    );

    // 3. UNISAT API - Runes (se tivermos API key)
    if (process.env.UNISAT_API_KEY) {
      apiPromises.push(
        fetchWithRetry(
          `https://open-api.unisat.io/v1/indexer/address/${address}/runes-balance-list`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.UNISAT_API_KEY}`,
              'accept': 'application/json'
            }
          }
        )
          .then(async (response) => {
            if (response) {
              const data = await response.json();
              console.log('🟣 Unisat Runes found:', data.data?.detail?.length || 0);
              
              runes = (data.data?.detail || []).map((rune: any) => ({
                runeid: rune.runeid,
                name: rune.rune,
                symbol: rune.symbol || rune.rune.slice(0, 3),
                spacedRune: rune.spacedRune,
                amount: rune.amount,
                divisibility: rune.divisibility || 0,
                runestone: rune.runestone,
                currentPrice: 0, // Precisa buscar de outra API
                totalValue: 0, // Será calculado
                txs: rune.txs || 0
              }));
            }
          })
          .catch(err => console.warn('Unisat API error:', err))
      );
    }

    // 4. ORDAPI.XYZ - Rare Sats (Free API)
    apiPromises.push(
      fetchWithRetry(`https://api.ordapi.xyz/address/${address}/rare-sats`)
        .then(async (response) => {
          if (response) {
            const data = await response.json();
            console.log('💎 Rare Sats found:', data.total_sats || 0);
            
            rareSats = (data.sats || []).map((sat: any) => ({
              sat: sat.sat,
              rarity: sat.rarity,
              name: sat.name || `${sat.rarity} Sat`,
              block: sat.block,
              offset: sat.offset,
              timestamp: sat.timestamp,
              value: sat.value || 10000, // valor estimado
              percentile: sat.percentile || '0%'
            }));
          }
        })
        .catch(err => console.warn('OrdAPI error:', err))
    );

    // 5. MEMPOOL.SPACE - UTXOs para valores reais
    apiPromises.push(
      fetchWithRetry(`https://mempool.space/api/address/${address}/utxo`)
        .then(async (response) => {
          if (response) {
            const utxos = await response.json();
            console.log('💰 UTXOs found:', utxos.length);
            
            // Somar valores de UTXOs que podem conter ordinals
            utxos.forEach((utxo: any) => {
              if (utxo.value > 10000) { // UTXOs maiores que 10k sats podem ter ordinals
                totalValue += utxo.value;
              }
            });
          }
        })
        .catch(err => console.warn('Mempool API error:', err))
    );

    // Aguardar todas as APIs
    await Promise.allSettled(apiPromises);

    // Se não encontrou nada nas APIs principais, tentar APIs alternativas
    if (inscriptions.length === 0 && ordinals.length === 0) {
      // Fallback: ORDINALS.COM API
      try {
        const ordinalsComResponse = await fetchWithRetry(
          `https://ordinals.com/api/address/${address}/inscriptions`
        );
        if (ordinalsComResponse) {
          const data = await ordinalsComResponse.json();
          console.log('🎨 Ordinals.com fallback data:', data);
        }
      } catch (err) {
        console.warn('Ordinals.com API error:', err);
      }
    }

    // Calcular valor total aproximado
    if (totalValue === 0) {
      totalValue = [
        ...inscriptions.map(i => i.value || 10000),
        ...ordinals.map(o => o.currentValue || 0),
        ...runes.map(r => r.totalValue || 0),
        ...rareSats.map(s => s.value || 0)
      ].reduce((sum, val) => sum + val, 0);
    }

    console.log('🎨 Final Ordinals/Runes data:', {
      inscriptions: inscriptions.length,
      ordinals: ordinals.length,
      runes: runes.length,
      rareSats: rareSats.length,
      totalValue
    });

    return {
      inscriptions,
      ordinals,
      runes,
      rareSats,
      totalValue
    };

  } catch (error) {
    console.error('❌ Error fetching Ordinals/Runes data:', error);
    return {
      inscriptions: [],
      ordinals: [],
      runes: [],
      rareSats: [],
      totalValue: 0
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

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

    const ordinalsData = await getOrdinalsData(address);

    return NextResponse.json({
      success: true,
      data: ordinalsData,
      debug: {
        address,
        timestamp: new Date().toISOString(),
        source: 'Real APIs: Hiro, Ordiscan, Mempool.space, OrdAPI',
        apis_used: [
          'api.hiro.so (inscriptions)',
          'api.ordiscan.com (collections)',
          'mempool.space (UTXOs)',
          'api.ordapi.xyz (rare sats)',
          process.env.UNISAT_API_KEY ? 'unisat.io (runes)' : null
        ].filter(Boolean),
        note: 'Using real blockchain data from multiple sources'
      }
    });

  } catch (error) {
    console.error('❌ Ordinals/Runes API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Ordinals/Runes data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}