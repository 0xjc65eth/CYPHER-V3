// CoinMarketCap API Usage Examples
import CMC from '../index';

// Example 1: Basic Market Overview
async function getMarketOverview() {
  console.log('=== Market Overview ===');
  
  // Get top 10 cryptocurrencies
  const topCryptos = await CMC.getTop(10);
  console.log('\nTop 10 Cryptocurrencies:');
  topCryptos.forEach((crypto, index) => {
    const quote = crypto.quote.USD;
    console.log(
      `${index + 1}. ${crypto.name} (${crypto.symbol}): ` +
      `$${quote.price.toFixed(2)} ` +
      `(${quote.percent_change_24h > 0 ? '+' : ''}${quote.percent_change_24h.toFixed(2)}%)`
    );
  });

  // Get market statistics
  const marketStats = await CMC.marketStats();
  console.log('\nMarket Statistics:');
  console.log(`Total Market Cap: $${(marketStats.totalMarketCap / 1e12).toFixed(2)}T`);
  console.log(`24h Volume: $${(marketStats.totalVolume24h / 1e9).toFixed(2)}B`);
  console.log(`BTC Dominance: ${marketStats.btcDominance.toFixed(2)}%`);
  console.log(`Active Cryptos: ${marketStats.activeCryptocurrencies.toLocaleString()}`);
}

// Example 2: Market Sentiment Analysis
async function analyzeSentiment() {
  console.log('\n=== Market Sentiment Analysis ===');
  
  const sentiment = await CMC.sentiment();
  
  console.log('\nFear & Greed Index:');
  console.log(`Value: ${sentiment.fearGreedIndex.value}/100`);
  console.log(`Status: ${sentiment.fearGreedIndex.value_classification}`);
  
  console.log('\nAltcoin Season Index:');
  console.log(`Value: ${sentiment.altcoinSeasonIndex.value}%`);
  console.log(`Status: ${sentiment.altcoinSeasonIndex.status}`);
  
  console.log('\nMarket Summary:');
  console.log(sentiment.summary);
  
  console.log('\nRecommendations:');
  sentiment.recommendations.forEach(rec => console.log(`• ${rec}`));
}

// Example 3: Trending Analysis
async function getTrendingAnalysis() {
  console.log('\n=== Trending Analysis ===');
  
  // Get trending data
  const trending = await CMC.trending({ time_period: '24h' });
  
  console.log('\n🔥 Trending Now:');
  trending.trending.slice(0, 5).forEach((crypto, index) => {
    console.log(`${index + 1}. ${crypto.name} (${crypto.symbol})`);
  });

  // Get gainers and losers
  const { gainers, losers } = await CMC.gainersLosers({ limit: 5 });
  
  console.log('\n📈 Top Gainers (24h):');
  gainers.forEach((crypto, index) => {
    const change = crypto.quote.USD.percent_change_24h;
    console.log(`${index + 1}. ${crypto.name}: +${change.toFixed(2)}%`);
  });
  
  console.log('\n📉 Top Losers (24h):');
  losers.forEach((crypto, index) => {
    const change = crypto.quote.USD.percent_change_24h;
    console.log(`${index + 1}. ${crypto.name}: ${change.toFixed(2)}%`);
  });
}

// Example 4: Cryptocurrency Deep Dive
async function cryptoDeepDive(symbol: string) {
  console.log(`\n=== ${symbol} Deep Dive ===`);
  
  // Get detailed quote
  const crypto = await CMC.getBySymbol(symbol);
  const quote = crypto.quote.USD;
  
  console.log(`\n${crypto.name} (${crypto.symbol})`);
  console.log(`Rank: #${crypto.cmc_rank}`);
  console.log(`Price: $${quote.price.toFixed(quote.price < 1 ? 4 : 2)}`);
  console.log(`Market Cap: $${(quote.market_cap / 1e9).toFixed(2)}B`);
  console.log(`24h Volume: $${(quote.volume_24h / 1e9).toFixed(2)}B`);
  console.log(`Circulating Supply: ${(crypto.circulating_supply / 1e6).toFixed(2)}M`);
  
  console.log('\nPrice Changes:');
  console.log(`1h: ${quote.percent_change_1h > 0 ? '+' : ''}${quote.percent_change_1h.toFixed(2)}%`);
  console.log(`24h: ${quote.percent_change_24h > 0 ? '+' : ''}${quote.percent_change_24h.toFixed(2)}%`);
  console.log(`7d: ${quote.percent_change_7d > 0 ? '+' : ''}${quote.percent_change_7d.toFixed(2)}%`);
  console.log(`30d: ${quote.percent_change_30d > 0 ? '+' : ''}${quote.percent_change_30d.toFixed(2)}%`);
  
  // Get market pairs
  const marketPairs = await CMC.marketPairs({ symbol, limit: 5 });
  console.log('\nTop Trading Pairs:');
  marketPairs.market_pairs.forEach((pair, index) => {
    console.log(
      `${index + 1}. ${pair.exchange.name}: ` +
      `${pair.market_pair} ` +
      `($${(pair.volume_24h / 1e6).toFixed(2)}M volume)`
    );
  });
}

// Example 5: DeFi and Stablecoin Analysis
async function defiAnalysis() {
  console.log('\n=== DeFi & Stablecoin Analysis ===');
  
  // Get DeFi statistics
  const defiStats = await CMC.defiStats();
  console.log('\nDeFi Market:');
  console.log(`Market Cap: $${(defiStats.marketCap / 1e9).toFixed(2)}B`);
  console.log(`24h Volume: $${(defiStats.volume24h / 1e9).toFixed(2)}B`);
  console.log(`24h Change: ${defiStats.change24h > 0 ? '+' : ''}${defiStats.change24h.toFixed(2)}%`);
  console.log(`Market Share: ${defiStats.dominance.toFixed(2)}%`);
  
  // Get Stablecoin statistics
  const stableStats = await CMC.stablecoinStats();
  console.log('\nStablecoin Market:');
  console.log(`Market Cap: $${(stableStats.marketCap / 1e9).toFixed(2)}B`);
  console.log(`24h Volume: $${(stableStats.volume24h / 1e9).toFixed(2)}B`);
  console.log(`24h Change: ${stableStats.change24h > 0 ? '+' : ''}${stableStats.change24h.toFixed(2)}%`);
  console.log(`Market Share: ${stableStats.dominance.toFixed(2)}%`);
}

// Example 6: Price Conversion
async function priceConversions() {
  console.log('\n=== Price Conversions ===');
  
  // BTC to ETH conversion
  const btcToEth = await CMC.convertCrypto(1, 'BTC', 'ETH');
  console.log(`\n1 BTC = ${btcToEth.to.amount.toFixed(4)} ETH`);
  
  // ETH to multiple currencies
  const ethConversions = await (CMC as any).convert.convertToMultipleCurrencies(
    1,
    'ETH',
    ['USD', 'EUR', 'GBP', 'JPY', 'BRL']
  );

  console.log('\n1 ETH equals:');
  ethConversions.conversions.forEach((conv: any) => {
    console.log(`${conv.currency}: ${conv.amount.toFixed(2)}`);
  });
}

// Example 7: Historical Data
async function historicalAnalysis() {
  console.log('\n=== Historical Analysis ===');
  
  // Get OHLCV data for the last 7 days
  const ohlcv = await CMC.ohlcv.historical({
    symbol: 'BTC',
    period: 'daily',
    count: 7,
    convert: 'USD'
  });
  
  console.log('\nBitcoin - Last 7 Days:');
  ohlcv.quotes.forEach(quote => {
    const date = new Date(quote.time_open).toLocaleDateString();
    console.log(
      `${date}: ` +
      `Open: $${quote.open.toFixed(2)}, ` +
      `High: $${quote.high.toFixed(2)}, ` +
      `Low: $${quote.low.toFixed(2)}, ` +
      `Close: $${quote.close.toFixed(2)}`
    );
  });
}

// Example 8: Portfolio Tracking
async function trackPortfolio(holdings: { symbol: string; amount: number }[]) {
  console.log('\n=== Portfolio Tracking ===');
  
  const symbols = holdings.map(h => h.symbol).join(',');
  const quotes = await CMC.quotes({ symbol: symbols });
  
  let totalValue = 0;
  const portfolioData = holdings.map(holding => {
    const crypto = Object.values(quotes).find(q => q.symbol === holding.symbol);
    if (!crypto) return null;
    
    const value = holding.amount * crypto.quote.USD.price;
    totalValue += value;
    
    return {
      symbol: holding.symbol,
      name: crypto.name,
      amount: holding.amount,
      price: crypto.quote.USD.price,
      value,
      change24h: crypto.quote.USD.percent_change_24h
    };
  }).filter(Boolean);
  
  console.log('\nPortfolio Holdings:');
  portfolioData.forEach(asset => {
    if (!asset) return;
    console.log(
      `${asset.name} (${asset.symbol}): ` +
      `${asset.amount} × $${asset.price.toFixed(2)} = ` +
      `$${asset.value.toFixed(2)} ` +
      `(${asset.change24h > 0 ? '+' : ''}${asset.change24h.toFixed(2)}%)`
    );
  });
  
  console.log(`\nTotal Portfolio Value: $${totalValue.toFixed(2)}`);
}

// Run examples
async function runExamples() {
  try {
    // Basic examples
    await getMarketOverview();
    await analyzeSentiment();
    await getTrendingAnalysis();
    
    // Detailed analysis
    await cryptoDeepDive('BTC');
    await defiAnalysis();
    
    // Conversions and historical
    await priceConversions();
    await historicalAnalysis();
    
    // Portfolio example
    await trackPortfolio([
      { symbol: 'BTC', amount: 0.5 },
      { symbol: 'ETH', amount: 10 },
      { symbol: 'BNB', amount: 25 }
    ]);
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export functions for individual use
export {
  getMarketOverview,
  analyzeSentiment,
  getTrendingAnalysis,
  cryptoDeepDive,
  defiAnalysis,
  priceConversions,
  historicalAnalysis,
  trackPortfolio,
  runExamples
};