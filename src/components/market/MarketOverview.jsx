// components/Market/MarketOverview.jsx
import React, { useState, useEffect } from 'react';
import { CoinMarketCapService } from '../../services/CoinMarketCapService';

export const MarketOverview = () => {
  const [marketData, setMarketData] = useState([]);
  const [globalData, setGlobalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const cmcService = new CoinMarketCapService();

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 30000); // Atualizar a cada 30s
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Criar ticker estilo Wall Street
    if (marketData.length > 0) {
      const tickerText = marketData
        .slice(0, 10)
        .map(coin => `${coin.symbol} $${coin.price.toFixed(2)} ${coin.percent_change_24h > 0 ? '↑' : '↓'}${Math.abs(coin.percent_change_24h).toFixed(2)}%`)
        .join(' • ');
      
      setTicker(tickerText + ' • ');
    }
  }, [marketData]);

  const loadMarketData = async () => {
    try {
      setRefreshing(true);
      
      // Simular dados do mercado (em produção, usar API real)
      const mockListings = generateMockMarketData();
      const mockGlobal = {
        total_market_cap: 2453000000000,
        total_volume_24h: 87654321000,
        btc_dominance: 48.5,
        eth_dominance: 18.2,
        active_cryptocurrencies: 23456
      };
      
      setMarketData(mockListings);
      setGlobalData(mockGlobal);
    } catch (error) {
      console.error('Erro ao carregar dados do mercado:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMockMarketData = () => {
    const coins = [
      { symbol: 'BTC', name: 'Bitcoin', price: 65432.10, percent_change_24h: 2.34, volume_24h: 28765432100, market_cap: 1278900000000 },
      { symbol: 'ETH', name: 'Ethereum', price: 3456.78, percent_change_24h: -0.89, volume_24h: 15432100000, market_cap: 415670000000 },
      { symbol: 'BNB', name: 'Binance Coin', price: 567.89, percent_change_24h: 1.23, volume_24h: 1234567890, market_cap: 87654000000 },
      { symbol: 'XRP', name: 'Ripple', price: 0.6789, percent_change_24h: 5.67, volume_24h: 2345678901, market_cap: 36789000000 },
      { symbol: 'SOL', name: 'Solana', price: 145.67, percent_change_24h: -2.34, volume_24h: 987654321, market_cap: 64321000000 },
      { symbol: 'ADA', name: 'Cardano', price: 0.5678, percent_change_24h: 3.45, volume_24h: 456789012, market_cap: 19876000000 },
      { symbol: 'AVAX', name: 'Avalanche', price: 38.90, percent_change_24h: -1.56, volume_24h: 345678901, market_cap: 14567000000 },
      { symbol: 'DOGE', name: 'Dogecoin', price: 0.1234, percent_change_24h: 8.90, volume_24h: 567890123, market_cap: 17890000000 },
      { symbol: 'DOT', name: 'Polkadot', price: 7.89, percent_change_24h: 1.78, volume_24h: 234567890, market_cap: 9876000000 },
      { symbol: 'MATIC', name: 'Polygon', price: 0.8901, percent_change_24h: -3.21, volume_24h: 345678901, market_cap: 8234000000 },
      { symbol: 'SHIB', name: 'Shiba Inu', price: 0.00002345, percent_change_24h: 12.34, volume_24h: 1234567890, market_cap: 13821000000 },
      { symbol: 'UNI', name: 'Uniswap', price: 9.87, percent_change_24h: 2.10, volume_24h: 123456789, market_cap: 7456000000 },
      { symbol: 'LINK', name: 'Chainlink', price: 15.43, percent_change_24h: -0.45, volume_24h: 234567890, market_cap: 8901000000 },
      { symbol: 'ATOM', name: 'Cosmos', price: 11.23, percent_change_24h: 4.56, volume_24h: 167890123, market_cap: 4123000000 },
      { symbol: 'LTC', name: 'Litecoin', price: 89.01, percent_change_24h: 1.89, volume_24h: 456789012, market_cap: 6543000000 },
      { symbol: 'FTM', name: 'Fantom', price: 0.5432, percent_change_24h: -5.43, volume_24h: 98765432, market_cap: 1543000000 },
      { symbol: 'NEAR', name: 'NEAR Protocol', price: 4.32, percent_change_24h: 6.78, volume_24h: 87654321, market_cap: 4567000000 },
      { symbol: 'ALGO', name: 'Algorand', price: 0.2109, percent_change_24h: -1.23, volume_24h: 76543210, market_cap: 1654000000 },
      { symbol: 'VET', name: 'VeChain', price: 0.0345, percent_change_24h: 3.21, volume_24h: 65432109, market_cap: 2234000000 },
      { symbol: 'ICP', name: 'Internet Computer', price: 12.34, percent_change_24h: -2.10, volume_24h: 54321098, market_cap: 5678000000 }
    ];

    // Return static fallback prices (no random jitter)
    return coins;
  };

  const formatNumber = (num) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="market-overview wall-street bg-black text-green-400 font-mono p-6 rounded-xl border-2 border-green-600 shadow-2xl">
      {/* Header */}
      <div className="trading-floor-header flex justify-between items-center pb-4 border-b-2 border-green-600 mb-6">
        <h1 className="text-3xl font-bold tracking-wide animate-pulse">
          💹 PREGÃO CRYPTO
        </h1>
        <div className="live-indicator flex items-center">
          <span className="blink w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></span>
          <span className="text-red-500 font-bold">AO VIVO</span>
        </div>
      </div>

      {/* Market Ticker */}
      <div className="market-ticker bg-gray-900 border border-green-600 rounded p-3 mb-6 overflow-hidden">
        <div className="ticker-content whitespace-nowrap animate-scroll">
          <span>{ticker}</span>
          <span>{ticker}</span>
        </div>
      </div>

      {/* Global Metrics */}
      <div className="global-metrics grid grid-cols-3 gap-4 mb-6">
        <div className="metric bg-gray-900 border border-green-600 rounded p-4 text-center">
          <label className="text-xs text-gray-400 block">CAPITALIZAÇÃO TOTAL</label>
          <span className="value text-2xl font-bold text-green-400 block mt-1">
            ${formatNumber(globalData?.total_market_cap || 0)}
          </span>
        </div>
        <div className="metric bg-gray-900 border border-green-600 rounded p-4 text-center">
          <label className="text-xs text-gray-400 block">VOLUME 24H</label>
          <span className="value text-2xl font-bold text-green-400 block mt-1">
            ${formatNumber(globalData?.total_volume_24h || 0)}
          </span>
        </div>
        <div className="metric bg-gray-900 border border-green-600 rounded p-4 text-center">
          <label className="text-xs text-gray-400 block">DOMINÂNCIA BTC</label>
          <span className="value text-2xl font-bold text-green-400 block mt-1">
            {globalData?.btc_dominance?.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Market Board */}
      <div className="market-board">
        <table className="trading-table w-full">
          <thead>
            <tr className="bg-gray-900 border-b border-green-600">
              <th className="text-left p-3 text-xs text-gray-400">ATIVO</th>
              <th className="text-right p-3 text-xs text-gray-400">ÚLTIMO</th>
              <th className="text-right p-3 text-xs text-gray-400">24H</th>
              <th className="text-right p-3 text-xs text-gray-400 hidden md:table-cell">VOLUME</th>
              <th className="text-right p-3 text-xs text-gray-400 hidden lg:table-cell">CAP. MERCADO</th>
            </tr>
          </thead>
          <tbody>
            {marketData.slice(0, 20).map((coin) => (
              <tr 
                key={coin.symbol} 
                className={`border-b border-gray-800 hover:bg-gray-900 transition-colors ${
                  coin.percent_change_24h > 0 ? 'bg-green-950/20' : 'bg-red-950/20'
                }`}
              >
                <td className="symbol p-3 font-bold text-green-400">{coin.symbol}</td>
                <td className="price text-right p-3 text-white font-medium">
                  ${formatNumber(coin.price)}
                </td>
                <td className="change text-right p-3">
                  <span className={`font-bold ${
                    coin.percent_change_24h > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {coin.percent_change_24h > 0 ? '▲' : '▼'} {Math.abs(coin.percent_change_24h).toFixed(2)}%
                  </span>
                </td>
                <td className="volume text-right p-3 text-gray-400 hidden md:table-cell">
                  ${formatNumber(coin.volume_24h)}
                </td>
                <td className="market-cap text-right p-3 text-gray-400 hidden lg:table-cell">
                  ${formatNumber(coin.market_cap)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={loadMarketData}
          disabled={refreshing}
          className="bg-green-600 hover:bg-green-700 text-black font-bold py-2 px-6 rounded transition-colors disabled:opacity-50"
        >
          {refreshing ? '🔄 Atualizando...' : '🔄 Atualizar Dados'}
        </button>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .animate-scroll {
          animation: scroll 30s linear infinite;
          display: inline-block;
        }
      `}</style>
    </div>
  );
};

export default MarketOverview;