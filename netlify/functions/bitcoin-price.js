// Bitcoin Price Function for Netlify
exports.handler = async (event, context) => {
  const CMC_API_KEY = process.env.CMC_API_KEY || 'c045d2a9-6f2d-44e9-8297-a88ab83b463b';
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Try CoinMarketCap first
    const cmcResponse = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC&convert=USD',
      {
        headers: {
          'X-CMC_PRO_API_KEY': CMC_API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    if (cmcResponse.ok) {
      const cmcData = await cmcResponse.json();
      const btcData = cmcData.data.BTC;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          symbol: 'BTC/USD',
          price: btcData.quote.USD.price,
          change24h: btcData.quote.USD.percent_change_24h,
          change7d: btcData.quote.USD.percent_change_7d,
          volume24h: btcData.quote.USD.volume_24h,
          marketCap: btcData.quote.USD.market_cap,
          circulatingSupply: btcData.circulating_supply,
          totalSupply: btcData.total_supply,
          maxSupply: btcData.max_supply,
          dominance: btcData.quote.USD.market_cap_dominance || 52.5,
          rank: btcData.cmc_rank,
          high24h: btcData.quote.USD.price * 1.02, // Approximate
          low24h: btcData.quote.USD.price * 0.98,  // Approximate
          timestamp: new Date().toISOString(),
          source: 'coinmarketcap',
          lastUpdated: btcData.last_updated
        })
      };
    }
  } catch (error) {
    console.error('CoinMarketCap API error:', error);
  }

  // Fallback to Binance
  try {
    const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    
    if (binanceResponse.ok) {
      const data = await binanceResponse.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          symbol: 'BTC/USDT',
          price: parseFloat(data.lastPrice),
          change24h: parseFloat(data.priceChangePercent),
          volume24h: parseFloat(data.volume) * parseFloat(data.lastPrice),
          high24h: parseFloat(data.highPrice),
          low24h: parseFloat(data.lowPrice),
          marketCap: parseFloat(data.lastPrice) * 19700000,
          circulatingSupply: 19700000,
          dominance: 52.5,
          timestamp: new Date().toISOString(),
          source: 'binance'
        })
      };
    }
  } catch (error) {
    console.error('Binance API error:', error);
  }

  // Final fallback
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      symbol: 'BTC/USD',
      price: 67432.10,
      change24h: 2.34,
      volume24h: 28543678234,
      marketCap: 1325000000000,
      circulatingSupply: 19654321,
      dominance: 52.4,
      timestamp: new Date().toISOString(),
      source: 'fallback',
      error: 'All APIs unavailable'
    })
  };
};