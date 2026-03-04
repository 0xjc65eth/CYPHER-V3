import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface AssetPnL {
  symbol: string;
  name: string;
  holdings: number;
  averageBuyPrice: number;
  averageSellPrice: number;
  currentPrice: number;
  totalInvested: number;
  currentValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  pnlPercent: number;
  transactions: Transaction[];
}

interface Transaction {
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  date: Date;
  fee: number;
  exchange: string;
}

export const PortfolioPnL: React.FC = () => {
  const walletContext = useWallet() as any;
  const { address, isConnected } = walletContext || {};
  const connected = isConnected ?? false;
  const wallet = walletContext;

  const [assets, setAssets] = useState<AssetPnL[]>([]);
  const [totalPnL, setTotalPnL] = useState({
    realized: 0,
    unrealized: 0,
    total: 0,
    percent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (connected && wallet && address) {
      fetchPortfolioData();
    }
  }, [connected, wallet, address]);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);

      // Fetch wallet balances - handle different wallet interface formats
      const balances = wallet.portfolioData?.assets || wallet.walletInfo?.assets || [];

      // Fetch transaction history from multiple sources
      const transactions = await fetchTransactionHistory(address || '');

      // Calculate P&L for each asset
      const assetPnLData = await calculateAssetPnL(balances, transactions);

      setAssets(assetPnLData);

      // Calculate total portfolio P&L
      const totals = calculateTotalPnL(assetPnLData);
      setTotalPnL(totals);

    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionHistory = async (address: string) => {
    // Fetch from multiple sources: CEX APIs, blockchain explorers, etc.
    const sources = [
      fetchBinanceHistory(address),
      fetchEtherscanHistory(address),
      fetchBscScanHistory(address),
      // Add more sources as needed
    ];
    
    const results = await Promise.all(sources);
    return results.flat();
  };

  const calculateAssetPnL = async (balances: any[], transactions: Transaction[]) => {
    const assetMap = new Map<string, AssetPnL>();

    // Group transactions by asset
    transactions.forEach((tx: any) => {
      const txSymbol = tx.symbol || tx.asset || 'UNKNOWN';
      const txName = tx.name || txSymbol;

      if (!assetMap.has(txSymbol)) {
        assetMap.set(txSymbol, {
          symbol: txSymbol,
          name: txName,
          holdings: 0,
          averageBuyPrice: 0,
          averageSellPrice: 0,
          currentPrice: 0,
          totalInvested: 0,
          currentValue: 0,
          realizedPnL: 0,
          unrealizedPnL: 0,
          totalPnL: 0,
          pnlPercent: 0,
          transactions: [],
        });
      }

      const asset = assetMap.get(txSymbol)!;
      asset.transactions.push(tx);

      if (tx.type === 'buy') {
        asset.totalInvested += (tx.amount || 0) * (tx.price || 0) + (tx.fee || 0);
        asset.holdings += tx.amount || 0;
      } else if (tx.type === 'sell') {
        asset.realizedPnL += ((tx.amount || 0) * (tx.price || 0)) - ((tx.amount || 0) * asset.averageBuyPrice) - (tx.fee || 0);
        asset.holdings -= tx.amount || 0;
      }
    });
    
    // Calculate average prices and current values
    for (const [symbol, asset] of assetMap) {
      // Calculate average buy price (FIFO method)
      const buyTxs = asset.transactions.filter(tx => tx.type === 'buy');
      const totalBuyAmount = buyTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const totalBuyCost = buyTxs.reduce((sum, tx) => sum + (tx.amount * tx.price), 0);
      asset.averageBuyPrice = totalBuyAmount > 0 ? totalBuyCost / totalBuyAmount : 0;
      
      // Calculate average sell price
      const sellTxs = asset.transactions.filter(tx => tx.type === 'sell');
      const totalSellAmount = sellTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const totalSellValue = sellTxs.reduce((sum, tx) => sum + (tx.amount * tx.price), 0);
      asset.averageSellPrice = totalSellAmount > 0 ? totalSellValue / totalSellAmount : 0;
      
      // Fetch current price
      asset.currentPrice = await fetchCurrentPrice(symbol);
      
      // Calculate current value and unrealized P&L
      asset.currentValue = asset.holdings * asset.currentPrice;
      asset.unrealizedPnL = asset.currentValue - (asset.holdings * asset.averageBuyPrice);
      
      // Total P&L
      asset.totalPnL = asset.realizedPnL + asset.unrealizedPnL;
      asset.pnlPercent = asset.totalInvested > 0 ? (asset.totalPnL / asset.totalInvested) * 100 : 0;
    }
    
    return Array.from(assetMap.values());
  };

  const calculateTotalPnL = (assets: AssetPnL[]) => {
    const realized = assets.reduce((sum, asset) => sum + asset.realizedPnL, 0);
    const unrealized = assets.reduce((sum, asset) => sum + asset.unrealizedPnL, 0);
    const total = realized + unrealized;
    const totalInvested = assets.reduce((sum, asset) => sum + asset.totalInvested, 0);
    const percent = totalInvested > 0 ? (total / totalInvested) * 100 : 0;
    
    return { realized, unrealized, total, percent };
  };

  if (!connected) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Connect your wallet to view P&L analysis</p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Portfolio P&L Summary */}
      <Card className="p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <h2 className="text-2xl font-bold mb-4">Portfolio P&L Analysis</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-400">Total P&L</p>
            <p className={`text-2xl font-bold ${totalPnL.total >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(totalPnL.total)}
            </p>
            <p className={`text-sm ${totalPnL.percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnL.percent >= 0 ? '+' : ''}{formatPercent(totalPnL.percent)}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-400">Realized P&L</p>
            <p className={`text-xl font-semibold ${totalPnL.realized >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(totalPnL.realized)}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-400">Unrealized P&L</p>
            <p className={`text-xl font-semibold ${totalPnL.unrealized >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(totalPnL.unrealized)}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-400">Portfolio Value</p>
            <p className="text-xl font-semibold">
              {formatCurrency(assets.reduce((sum, a) => sum + a.currentValue, 0))}
            </p>
          </div>
        </div>
      </Card>

      {/* Individual Asset P&L */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Asset Breakdown</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2">Asset</th>
                <th className="text-right p-2">Holdings</th>
                <th className="text-right p-2">Avg Buy</th>
                <th className="text-right p-2">Current</th>
                <th className="text-right p-2">Realized</th>
                <th className="text-right p-2">Unrealized</th>
                <th className="text-right p-2">Total P&L</th>
                <th className="text-right p-2">%</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.symbol} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="p-2">
                    <div>
                      <p className="font-semibold">{asset.symbol ?? '—'}</p>
                      <p className="text-xs text-gray-400">{asset.name ?? '—'}</p>
                    </div>
                  </td>
                  <td className="text-right p-2">{asset.holdings.toFixed(8)}</td>
                  <td className="text-right p-2">{formatCurrency(asset.averageBuyPrice)}</td>
                  <td className="text-right p-2">{formatCurrency(asset.currentPrice)}</td>
                  <td className={`text-right p-2 ${asset.realizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(asset.realizedPnL)}
                  </td>
                  <td className={`text-right p-2 ${asset.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(asset.unrealizedPnL)}
                  </td>
                  <td className={`text-right p-2 font-semibold ${asset.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(asset.totalPnL)}
                  </td>
                  <td className={`text-right p-2 ${asset.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {asset.pnlPercent >= 0 ? '+' : ''}{formatPercent(asset.pnlPercent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transaction History */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Recent Transactions</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {assets.flatMap(asset => asset.transactions)
            .sort((a: any, b: any) => {
              const dateA = a.date ? a.date.getTime() : 0;
              const dateB = b.date ? b.date.getTime() : 0;
              return dateB - dateA;
            })
            .slice(0, 20)
            .map((tx: any, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs ${tx.type === 'buy' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {(tx.type || 'unknown').toUpperCase()}
                  </span>
                  <div>
                    <p className="font-semibold">{tx.symbol || tx.asset || 'UNKNOWN'}</p>
                    <p className="text-xs text-gray-400">
                      {tx.date ? tx.date.toLocaleString() : tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Unknown date'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p>{(tx.amount || 0).toFixed(8)} @ {formatCurrency(tx.price || 0)}</p>
                  <p className="text-sm text-gray-400">Total: {formatCurrency((tx.amount || 0) * (tx.price || 0))}</p>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
};

// Helper functions
async function fetchBinanceHistory(address: string) {
  // Implementation for Binance API
  return [];
}

async function fetchEtherscanHistory(address: string) {
  // Implementation for Etherscan API
  return [];
}

async function fetchBscScanHistory(address: string) {
  // Implementation for BscScan API
  return [];
}

async function fetchCurrentPrice(symbol: string) {
  // Implementation to fetch current price
  return 0;
}