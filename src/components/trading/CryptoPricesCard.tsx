import React, { useState, useEffect } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { getCryptoPrices, formatPrice } from '@/services/coinmarketcap-service';

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  percentChange24h: number;
  lastUpdated: string;
}

export function CryptoPricesCard() {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);

        // Lista de criptomoedas para buscar
        const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'AVAX', 'DOGE'];

        // Nomes completos das criptomoedas
        const names: {[key: string]: string} = {
          'BTC': 'Bitcoin',
          'ETH': 'Ethereum',
          'BNB': 'Binance Coin',
          'SOL': 'Solana',
          'AVAX': 'Avalanche',
          'DOGE': 'Dogecoin'
        };

        try {
          // Buscar preços da API do CoinMarketCap
          const pricesData = await getCryptoPrices(symbols);

          // Verificar se temos dados válidos
          if (pricesData && Object.keys(pricesData).length > 0) {
            // Formatar os dados com validação
            const formattedPrices: CryptoPrice[] = symbols
              .filter(symbol => pricesData[symbol] &&
                typeof pricesData[symbol].price === 'number' &&
                !isNaN(pricesData[symbol].price))
              .map(symbol => ({
                symbol,
                name: names[symbol] || symbol,
                price: pricesData[symbol].price,
                percentChange24h: typeof pricesData[symbol].percentChange24h === 'number' ?
                  pricesData[symbol].percentChange24h : 0,
                lastUpdated: pricesData[symbol].lastUpdated || new Date().toISOString()
              }));

            // Atualizar o estado apenas se tivermos dados formatados
            if (formattedPrices.length > 0) {
              setPrices(formattedPrices);
              setLastUpdated(new Date().toISOString());
              setError(null);
            } else {
              // Se não temos dados formatados, manter os preços anteriores
              if (prices.length === 0) {
                // Se não temos preços anteriores, mostrar erro
                setError('Não foi possível obter preços válidos. Tente novamente mais tarde.');
              }
            }
          } else {
            if (prices.length === 0) {
              setError('Dados de preços indisponíveis. Tente novamente mais tarde.');
            }
          }
        } catch (apiError) {
          console.error('Erro na API de preços:', apiError);
          // Se já temos preços, manter os anteriores e não mostrar erro
          if (prices.length === 0) {
            setError('Falha na comunicação com a API de preços. Tente novamente mais tarde.');
          }
        }
      } catch (err) {
        console.error('Erro ao processar busca de preços:', err);
        setError('Falha ao carregar os preços. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();

    // Atualizar preços a cada 60 segundos
    const intervalId = setInterval(() => {
      try {
        fetchPrices();
      } catch (error) {
        console.error('Erro na atualização periódica de preços:', error);
      }
    }, 60000);

    return () => {
      try {
        clearInterval(intervalId);
      } catch (error) {
        console.error('Erro ao limpar intervalo:', error);
      }
    };
  }, [prices.length]);

  // Formatar a data de atualização
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Nunca atualizado';

    const date = new Date(lastUpdated);
    return date.toLocaleTimeString();
  };

  return (
    <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title className="text-white text-xl">Preços em Tempo Real</Title>
          <Text className="text-xs text-gray-400">
            Dados da API do CoinMarketCap • Atualizado às {formatLastUpdated()}
          </Text>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex justify-between items-center p-3 border border-gray-700/30 rounded-lg animate-pulse">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-gray-700/50 mr-3"></div>
                <div>
                  <div className="h-4 w-24 mb-1 bg-gray-700/50 rounded"></div>
                  <div className="h-3 w-16 bg-gray-700/50 rounded"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 w-20 mb-1 bg-gray-700/50 rounded"></div>
                <div className="h-3 w-16 bg-gray-700/50 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 text-center">
          <Text className="text-rose-400">{error}</Text>
        </div>
      ) : (
        <div className="space-y-3">
          {prices.map((crypto) => (
            <div key={crypto.symbol} className="flex justify-between items-center p-3 border border-gray-700/30 rounded-lg hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2A2D36] to-[#3A3D46] flex items-center justify-center mr-3">
                  <span className="text-xs font-bold text-white">{crypto.symbol}</span>
                </div>
                <div>
                  <Text className="text-white font-medium">{crypto.name}</Text>
                  <Text className="text-gray-400 text-xs">{crypto.symbol}</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="text-white font-medium">${formatPrice(crypto.price)}</Text>
                <Text className={crypto.percentChange24h >= 0 ? 'text-green-400 text-xs' : 'text-rose-400 text-xs'}>
                  {crypto.percentChange24h >= 0 ? '+' : ''}{crypto.percentChange24h.toFixed(2)}%
                </Text>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
        <Text className="text-xs text-blue-300 font-bold">INFORMAÇÃO:</Text>
        <Text className="text-xs text-gray-400 mt-1">
          Os preços são obtidos diretamente da API do CoinMarketCap usando a chave de API fornecida.
          Os dados são atualizados automaticamente a cada 60 segundos para garantir informações precisas e em tempo real.
        </Text>
      </div>
    </Card>
  );
}
