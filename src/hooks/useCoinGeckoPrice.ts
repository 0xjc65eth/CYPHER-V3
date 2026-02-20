import { usePriceData } from './usePriceData';

interface CoinGeckoPrice {
  usd: number;
  usd_24h_change: number;
  usd_24h_vol: number;
  usd_market_cap: number;
}

interface PriceData {
  bitcoin?: CoinGeckoPrice;
  ethereum?: CoinGeckoPrice;
  solana?: CoinGeckoPrice;
}

export function useCoinGeckoPrice() {
  const btc = usePriceData({ asset: 'BTC', source: 'coingecko', refetchInterval: 60000 });
  const eth = usePriceData({ asset: 'ETH', source: 'coingecko', refetchInterval: 60000 });
  const sol = usePriceData({ asset: 'SOL', source: 'coingecko', refetchInterval: 60000 });

  const prices: PriceData = {};

  if (btc.price > 0) {
    prices.bitcoin = {
      usd: btc.price,
      usd_24h_change: btc.change24h,
      usd_24h_vol: btc.volume24h,
      usd_market_cap: btc.marketCap,
    };
  }

  if (eth.price > 0) {
    prices.ethereum = {
      usd: eth.price,
      usd_24h_change: eth.change24h,
      usd_24h_vol: eth.volume24h,
      usd_market_cap: eth.marketCap,
    };
  }

  if (sol.price > 0) {
    prices.solana = {
      usd: sol.price,
      usd_24h_change: sol.change24h,
      usd_24h_vol: sol.volume24h,
      usd_market_cap: sol.marketCap,
    };
  }

  return {
    prices,
    loading: btc.isLoading || eth.isLoading || sol.isLoading,
    error: btc.error || eth.error || sol.error,
  };
}
