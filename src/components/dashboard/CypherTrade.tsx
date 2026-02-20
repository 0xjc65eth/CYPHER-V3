'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowUpDown, 
  ExternalLink, 
  ChevronDown,
  AlertCircle,
  TrendingUp,
  Zap,
  Globe,
  Wallet,
  Copy,
  CheckCircle,
  Bitcoin,
  Coins,
  Activity,
  Search,
  Route,
  Loader2,
  CheckSquare
} from 'lucide-react';

interface Token {
  symbol: string;
  name: string;
  address?: string;
  logoURI?: string;
  decimals?: number;
  price?: number;
}

interface DEXInfo {
  name: string;
  logo: string;
  chains: string[];
  url: string;
  description: string;
  color: string;
  fee: number;
  liquidity: number;
  estimatedGas: number;
}

interface WalletInfo {
  address: string;
  balance: number;
  network: string;
  connected: boolean;
}

interface RouteResult {
  dex: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  fee: number;
  gasEstimate: number;
  route: string[];
  totalCost: number;
  estimatedTime: string;
}

const SUPPORTED_DEXS: DEXInfo[] = [
  {
    name: 'Uniswap',
    logo: '🦄',
    chains: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Base'],
    url: 'https://app.uniswap.org',
    description: 'Leading Ethereum DEX',
    color: 'from-pink-500 to-purple-500',
    fee: 0.3,
    liquidity: 2.4,
    estimatedGas: 150000
  },
  {
    name: 'Jupiter',
    logo: '🪐',
    chains: ['Solana'],
    url: 'https://jup.ag',
    description: 'Best Solana aggregator',
    color: 'from-green-400 to-blue-500',
    fee: 0.1,
    liquidity: 1.8,
    estimatedGas: 5000
  },
  {
    name: 'Orca',
    logo: '🐋',
    chains: ['Solana'],
    url: 'https://www.orca.so',
    description: 'Solana AMM protocol',
    color: 'from-blue-400 to-cyan-500',
    fee: 0.25,
    liquidity: 1.2,
    estimatedGas: 4000
  },
  {
    name: 'SushiSwap',
    logo: '🍣',
    chains: ['Ethereum', 'Arbitrum', 'Polygon', 'Avalanche'],
    url: 'https://app.sushi.com',
    description: 'Multi-chain DEX',
    color: 'from-orange-500 to-red-500',
    fee: 0.3,
    liquidity: 1.5,
    estimatedGas: 180000
  },
  {
    name: 'RunesDEX',
    logo: '🔮',
    chains: ['Bitcoin'],
    url: 'https://runesdex.io',
    description: 'Bitcoin Runes trading',
    color: 'from-orange-500 to-yellow-500',
    fee: 0.5,
    liquidity: 0.8,
    estimatedGas: 0
  }
];

const NETWORKS = [
  { name: 'Ethereum', icon: '⟠', color: 'text-blue-400' },
  { name: 'Bitcoin', icon: '₿', color: 'text-orange-400' },
  { name: 'Solana', icon: '◎', color: 'text-purple-400' },
  { name: 'Arbitrum', icon: '🔵', color: 'text-blue-300' },
  { name: 'Polygon', icon: '🟣', color: 'text-purple-300' },
  { name: 'Base', icon: '🔷', color: 'text-blue-500' },
];

// Token definitions with real-time price fetching
const TOKENS_BY_NETWORK: Record<string, Token[]> = {
  Ethereum: [
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599' },
    { symbol: 'USDC', name: 'USD Coin', address: '0xa0b86a33e6aa047d31f4e1e0f5e1c8c0b6d8e1b8' },
    { symbol: 'USDT', name: 'Tether USD', address: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
    { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6b175474e89094c44da98b954eedeac495271d0f' },
    { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984' },
  ],
  Bitcoin: [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ORDI', name: 'Ordinals' },
    { symbol: 'SATS', name: 'SATS' },
    { symbol: 'RATS', name: 'RATS' },
    { symbol: 'RUNE•COIN', name: 'Rune Coin' },
  ],
  Solana: [
    { symbol: 'SOL', name: 'Solana', address: 'So11111111111111111111111111111111111111112' },
    { symbol: 'USDC', name: 'USD Coin', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    { symbol: 'RAY', name: 'Raydium', address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
    { symbol: 'SRM', name: 'Serum', address: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt' },
    { symbol: 'BONK', name: 'Bonk', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  ],
  Arbitrum: [
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'ARB', name: 'Arbitrum' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'USDT', name: 'Tether USD' },
  ],
  Polygon: [
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'USDT', name: 'Tether USD' },
  ],
  Base: [
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'CBETH', name: 'Coinbase Wrapped Staked ETH' },
  ]
};

const WALLET_PROVIDERS = {
  bitcoin: [
    { name: 'Xverse', icon: '🟠', id: 'xverse', provider: 'BitcoinProvider' },
    { name: 'Unisat', icon: '🦄', id: 'unisat', provider: 'unisat' },
    { name: 'OKX', icon: '⚫', id: 'okx', provider: 'okxwallet.bitcoin' },
    { name: 'Leather', icon: '🤎', id: 'leather', provider: 'LeatherProvider' },
  ],
  ethereum: [
    { name: 'MetaMask', icon: '🦊', id: 'metamask', provider: 'ethereum' },
    { name: 'WalletConnect', icon: '🔗', id: 'walletconnect', provider: 'walletconnect' },
    { name: 'Coinbase', icon: '💙', id: 'coinbase', provider: 'coinbaseWallet' },
  ],
  solana: [
    { name: 'Phantom', icon: '👻', id: 'phantom', provider: 'phantom.solana' },
    { name: 'Solflare', icon: '☀️', id: 'solflare', provider: 'solflare' },
    { name: 'Backpack', icon: '🎒', id: 'backpack', provider: 'backpack' },
  ]
};

export function CypherTrade() {
  const [selectedNetwork, setSelectedNetwork] = useState('Ethereum');
  const [tokenIn, setTokenIn] = useState<Token | null>(null);
  const [tokenOut, setTokenOut] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showTokenInDropdown, setShowTokenInDropdown] = useState(false);
  const [showTokenOutDropdown, setShowTokenOutDropdown] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSearchingRoutes, setIsSearchingRoutes] = useState(false);
  const [bestRoute, setBestRoute] = useState<RouteResult | null>(null);
  const [allRoutes, setAllRoutes] = useState<RouteResult[]>([]);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});

  const availableTokens = TOKENS_BY_NETWORK[selectedNetwork] || [];

  // Load token prices when network changes
  useEffect(() => {
    const loadTokenPrices = async () => {
      const prices: Record<string, number> = {};
      const tokens = TOKENS_BY_NETWORK[selectedNetwork] || [];
      
      for (const token of tokens) {
        const price = await getTokenPrice(token.symbol);
        prices[token.symbol] = price;
      }
      
      setTokenPrices(prices);
    };

    loadTokenPrices();
  }, [selectedNetwork]);

  // Enhanced wallet connection with real provider detection
  const connectWallet = async (walletId: string, provider: string) => {
    setIsConnecting(true);
    
    try {
      let walletProvider = null;
      let address = '';
      
      // Get real wallet provider
      const providerPath = provider.split('.');
      walletProvider = (window as any)[providerPath[0]];
      
      if (providerPath.length > 1) {
        for (let i = 1; i < providerPath.length; i++) {
          walletProvider = walletProvider?.[providerPath[i]];
        }
      }
      
      // Check if wallet is actually installed
      if (!walletProvider) {
        throw new Error(`${walletId} wallet extension not found. Please install it first.`);
      } else {
        // Try real wallet connection
        
        let accounts = [];
        
        try {
          if (selectedNetwork.toLowerCase() === 'bitcoin') {
            if (walletProvider.requestAccounts) {
              accounts = await walletProvider.requestAccounts();
            } else if (walletProvider.connect) {
              const result = await walletProvider.connect();
              accounts = [result.address || result];
            }
          } else if (selectedNetwork.toLowerCase() === 'ethereum' || 
                     ['arbitrum', 'polygon', 'base'].includes(selectedNetwork.toLowerCase())) {
            accounts = await walletProvider.request({
              method: 'eth_requestAccounts'
            });
          } else if (selectedNetwork.toLowerCase() === 'solana') {
            const result = await walletProvider.connect();
            accounts = [result.publicKey.toString()];
          }
          
          if (accounts && accounts.length > 0) {
            address = accounts[0];
          } else {
            throw new Error('No accounts returned');
          }
        } catch (providerError) {
          throw new Error(`Failed to connect to ${walletId}: ${(providerError as Error).message}`);
        }
      }
      
      // Get balance from real blockchain or demo
      const balance = await getRealBalance(address, selectedNetwork);
      
      setWalletInfo({
        address,
        balance,
        network: selectedNetwork,
        connected: true
      });
      
      setShowWalletOptions(false);
      
    } catch (error) {
      console.error(`❌ Failed to connect ${walletId}:`, error);
      alert(`Failed to connect to ${walletId}. Please try again or check if the wallet extension is installed.`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Get real balance from blockchain APIs
  const getRealBalance = async (address: string, network: string): Promise<number> => {
    try {
      switch (network.toLowerCase()) {
        case 'bitcoin':
          // Use real Bitcoin API
          const btcResponse = await fetch(`https://blockstream.info/api/address/${address}`);
          if (btcResponse.ok) {
            const btcData = await btcResponse.json();
            const balance = btcData.chain_stats.funded_txo_sum / 100000000; // Convert satoshis to BTC
            return balance;
          }
          break;
          
        case 'ethereum':
        case 'arbitrum':
        case 'polygon':
        case 'base':
          // Try to use connected wallet's API for real balance
          if ((window as any).ethereum) {
            try {
              const balance = await (window as any).ethereum.request({
                method: 'eth_getBalance',
                params: [address, 'latest']
              });
              const ethBalance = parseInt(balance, 16) / 1e18; // Convert wei to ETH
              return ethBalance;
            } catch (ethError) {
              return 0;
            }
          }
          break;
          
        case 'solana':
          // Use real Solana RPC
          try {
            const solResponse = await fetch('https://api.mainnet-beta.solana.com', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getBalance',
                params: [address]
              })
            });
            if (solResponse.ok) {
              const solData = await solResponse.json();
              const solBalance = solData.result.value / 1e9; // Convert lamports to SOL
              return solBalance;
            }
          } catch (solError) {
            return 0;
          }
          break;
      }
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
    }
    
    return 0;
  };

  // Get real token prices from CoinMarketCap
  const getTokenPrice = async (symbol: string): Promise<number> => {
    try {
      const response = await fetch(`/api/coinmarketcap/?symbols=${symbol}`);
      const data = await response.json();
      
      if (data.success && data.data.current[symbol]) {
        return data.data.current[symbol].price;
      }
    } catch (error) {
      console.error(`❌ Error fetching price for ${symbol}:`, error);
    }
    
    // Fallback to static prices if API fails
    const fallbackPrices: Record<string, number> = {
      'BTC': 107000,
      'ETH': 2500,
      'WBTC': 107000,
      'SOL': 200,
      'USDC': 1,
      'USDT': 1,
      'DAI': 1,
      'UNI': 12,
      'MATIC': 0.8,
      'ARB': 1.2,
      'ORDI': 45,
      'SATS': 0.000234,
      'RATS': 0.000089,
      'RUNE•COIN': 0.892
    };
    
    return fallbackPrices[symbol] || 1;
  };

  // Calculate correct token conversion with real market prices
  const calculateCorrectConversion = (
    inputAmount: number,
    tokenInPrice: number,
    tokenOutPrice: number,
    dexFee: number,
    slippage: number
  ): number => {
    // Convert input amount to USD value
    const inputValueUSD = inputAmount * tokenInPrice;
    
    // Apply DEX fee and slippage
    const feeMultiplier = 1 - (dexFee / 100);
    const slippageMultiplier = 1 - slippage;
    
    // Calculate output value in USD after fees
    const outputValueUSD = inputValueUSD * feeMultiplier * slippageMultiplier;
    
    // Convert back to output token amount
    const outputAmount = outputValueUSD / tokenOutPrice;
    
    
    return outputAmount;
  };

  // Search for best routes across DEXs
  const searchBestRoutes = async () => {
    if (!walletInfo?.connected || !tokenIn || !tokenOut || !amount) {
      alert('Please connect wallet and select tokens with amount first');
      return;
    }

    setIsSearchingRoutes(true);
    
    try {
      
      // Get real prices for both tokens
      const tokenInPrice = await getTokenPrice(tokenIn.symbol);
      const tokenOutPrice = await getTokenPrice(tokenOut.symbol);
      
      
      // Get available DEXs for the network
      const availableDEXs = SUPPORTED_DEXS.filter(dex => 
        dex.chains.includes(selectedNetwork)
      );

      const routes: RouteResult[] = [];
      const inputAmount = parseFloat(amount);
      
      for (const dex of availableDEXs) {
        // Estimated slippage based on liquidity
        const baseSlippage = 0.001; // 0.1% base slippage
        const liquidityImpact = inputAmount > 100 ? 0.005 : 0.001; // Higher slippage for large trades
        const dexLiquidityFactor = dex.liquidity > 2 ? 0.001 : dex.liquidity > 1 ? 0.002 : 0.003;
        const slippage = baseSlippage + liquidityImpact + dexLiquidityFactor;
        
        // Calculate correct conversion
        const outputAmount = calculateCorrectConversion(
          inputAmount,
          tokenInPrice,
          tokenOutPrice,
          dex.fee,
          slippage
        );
        
        // Calculate fees in USD
        const inputValueUSD = inputAmount * tokenInPrice;
        const cypherFeeUSD = inputValueUSD * 0.0035; // 0.35% CYPHER fee
        const dexFeeUSD = inputValueUSD * (dex.fee / 100);
        
        // Gas costs based on network
        const gasCostUSD = selectedNetwork === 'Solana' ? 0.005 : 
                          selectedNetwork === 'Bitcoin' ? 15 : // Bitcoin fees are higher
                          selectedNetwork === 'Ethereum' ? 25 : // ETH mainnet expensive
                          selectedNetwork === 'Arbitrum' ? 2 :
                          selectedNetwork === 'Polygon' ? 0.1 :
                          selectedNetwork === 'Base' ? 1 : 5;
        
        const totalCost = cypherFeeUSD + dexFeeUSD + gasCostUSD;
        
        routes.push({
          dex: dex.name,
          inputAmount,
          outputAmount,
          priceImpact: slippage * 100,
          fee: dex.fee + 0.35, // DEX fee + CYPHER fee
          gasEstimate: dex.estimatedGas,
          route: [tokenIn.symbol, tokenOut.symbol],
          totalCost,
          estimatedTime: selectedNetwork === 'Solana' ? '~5s' : 
                        selectedNetwork === 'Bitcoin' ? '~10m' : 
                        selectedNetwork === 'Arbitrum' ? '~15s' :
                        selectedNetwork === 'Polygon' ? '~2s' :
                        selectedNetwork === 'Base' ? '~5s' : '~2m'
        });
      }

      // Sort by best output amount (highest)
      routes.sort((a, b) => b.outputAmount - a.outputAmount);
      
      setAllRoutes(routes);
      setBestRoute(routes[0]);
      
      routes.forEach((route, i) => {
      });
      
    } catch (error) {
      console.error('❌ Error searching routes:', error);
      alert('Error searching routes. Please try again.');
    } finally {
      setIsSearchingRoutes(false);
    }
  };

  // Execute the trade through selected DEX
  const executeRoute = async (route: RouteResult) => {
    if (!walletInfo?.connected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // Find the DEX info
      const dex = SUPPORTED_DEXS.find(d => d.name === route.dex);
      if (!dex) return;

      // Track the redirect with real fee data
      const feeData = {
        dex: dex.name,
        network: selectedNetwork,
        tokenIn: tokenIn?.symbol || '',
        tokenOut: tokenOut?.symbol || '',
        amount: amount || '0',
        feePercentage: 0.35,
        walletAddress: walletInfo.address,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: window.location.origin,
        routeData: route
      };

      // Track the redirect
      const trackResponse = await fetch('/api/fees/track-redirect/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feeData)
      });

      let redirectUrl = dex.url;
      
      // Build specific URLs for each DEX
      switch (dex.name) {
        case 'Uniswap':
          if (tokenIn && tokenOut) {
            redirectUrl += `/#/swap?inputCurrency=${encodeURIComponent(tokenIn.address || tokenIn.symbol)}&outputCurrency=${encodeURIComponent(tokenOut.address || tokenOut.symbol)}`;
            if (amount) redirectUrl += `&exactAmount=${amount}`;
          }
          break;
        case 'Jupiter':
          if (tokenIn && tokenOut) {
            redirectUrl += `/swap/${encodeURIComponent(tokenIn.address || tokenIn.symbol)}-${encodeURIComponent(tokenOut.address || tokenOut.symbol)}`;
            if (amount) redirectUrl += `?inAmount=${amount}`;
          }
          break;
        case 'SushiSwap':
          if (tokenIn && tokenOut) {
            redirectUrl += `/swap?inputCurrency=${encodeURIComponent(tokenIn.address || tokenIn.symbol)}&outputCurrency=${encodeURIComponent(tokenOut.address || tokenOut.symbol)}`;
            if (amount) redirectUrl += `&exactAmount=${amount}`;
          }
          break;
        case 'RunesDEX':
          if (tokenIn && tokenOut) {
            redirectUrl += `/trade?from=${encodeURIComponent(tokenIn.symbol)}&to=${encodeURIComponent(tokenOut.symbol)}`;
            if (amount) redirectUrl += `&amount=${amount}`;
          }
          break;
      }
      
      // Add CYPHER referral parameters
      const separator = redirectUrl.includes('?') ? '&' : '?';
      redirectUrl += `${separator}ref=cypher&fee=0.35&wallet=${encodeURIComponent(walletInfo.address)}`;
      
      
      // Show route summary before redirect
      const routeSummary = `
🎯 CYPHER TRADE - Best Route Found!

📊 Route: ${tokenIn?.symbol} → ${tokenOut?.symbol}
💱 DEX: ${route.dex}
💰 Input: ${route.inputAmount} ${tokenIn?.symbol}
📈 Output: ${route.outputAmount.toFixed(6)} ${tokenOut?.symbol}
💸 Total Fee: ${route.fee}% (DEX + CYPHER)
⛽ Gas: ${route.estimatedTime}
💵 Total Cost: $${route.totalCost.toFixed(2)}

🔗 Redirecting to ${route.dex}...
      `;
      
      alert(routeSummary);
      
      // Open DEX in new tab
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      console.error('❌ Error executing route:', error);
      alert('Error executing route. Please try again.');
    }
  };

  const disconnectWallet = () => {
    setWalletInfo(null);
    setBestRoute(null);
    setAllRoutes([]);
  };

  const copyAddress = async () => {
    if (walletInfo?.address) {
      try {
        await navigator.clipboard.writeText(walletInfo.address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy address');
      }
    }
  };

  const swapTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
  };

  const selectToken = (token: Token, isTokenIn: boolean) => {
    if (isTokenIn) {
      setTokenIn(token);
      setShowTokenInDropdown(false);
    } else {
      setTokenOut(token);
      setShowTokenOutDropdown(false);
    }
    // Clear previous route results when tokens change
    setBestRoute(null);
    setAllRoutes([]);
  };

  return (
    <div className="space-y-4">
      
      {/* Wallet Connection Section */}
      {!walletInfo?.connected ? (
        <div className="border border-orange-500/30 rounded-lg p-4 bg-orange-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-orange-400" />
            <span className="font-medium text-orange-400">Connect Wallet to Start Trading</span>
          </div>
          
          {/* Network Selector */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Network</label>
            <div className="relative">
              <button
                onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                className="w-full flex items-center justify-between p-3 bg-gray-800/50 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {NETWORKS.find(n => n.name === selectedNetwork)?.icon}
                  </span>
                  <span className={`font-medium ${NETWORKS.find(n => n.name === selectedNetwork)?.color}`}>
                    {selectedNetwork}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showNetworkDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
                  {NETWORKS.map((network) => (
                    <button
                      key={network.name}
                      onClick={() => {
                        setSelectedNetwork(network.name);
                        setShowNetworkDropdown(false);
                        setWalletInfo(null); // Reset wallet when changing network
                        setTokenIn(null); // Reset tokens
                        setTokenOut(null);
                        setBestRoute(null);
                        setAllRoutes([]);
                      }}
                      className="w-full flex items-center gap-2 p-3 hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      <span className="text-lg">{network.icon}</span>
                      <span className={`font-medium ${network.color}`}>{network.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Wallet Options */}
          <button
            onClick={() => setShowWalletOptions(!showWalletOptions)}
            className="w-full flex items-center justify-between p-3 bg-orange-600/20 border border-orange-500/50 rounded-lg hover:bg-orange-600/30 transition-colors"
          >
            <span className="font-medium text-orange-300">Choose Wallet</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showWalletOptions ? 'rotate-180' : ''}`} />
          </button>

          {showWalletOptions && (
            <div className="mt-3 space-y-2">
              {WALLET_PROVIDERS[selectedNetwork.toLowerCase() as keyof typeof WALLET_PROVIDERS]?.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => connectWallet(wallet.id, wallet.provider)}
                  disabled={isConnecting}
                  className="w-full flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <span className="text-lg">{wallet.icon}</span>
                  <span className="font-medium text-white">{wallet.name}</span>
                  {isConnecting && <div className="ml-auto w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Connected Wallet Display */
        <div className="border border-green-500/30 rounded-lg p-4 bg-green-500/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-medium text-green-400">Wallet Connected</span>
            </div>
            <button
              onClick={disconnectWallet}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Disconnect
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">
                {selectedNetwork} • {walletInfo.balance.toFixed(4)} {selectedNetwork === 'Bitcoin' ? 'BTC' : selectedNetwork === 'Ethereum' ? 'ETH' : 'SOL'}
              </div>
              <div className="font-mono text-sm text-white">
                {walletInfo.address.slice(0, 8)}...{walletInfo.address.slice(-6)}
              </div>
            </div>
            <button
              onClick={copyAddress}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Trading Interface - Only show when wallet is connected */}
      {walletInfo?.connected && (
        <div className="space-y-3">
          
          {/* Token Selection */}
          <div className="space-y-3">
            
            {/* From Token */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">From Token</label>
              <div className="relative">
                <button
                  onClick={() => setShowTokenInDropdown(!showTokenInDropdown)}
                  className="w-full flex items-center justify-between p-3 bg-gray-800/50 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {tokenIn ? (
                      <>
                        <Coins className="w-5 h-5 text-blue-400" />
                        <div className="text-left">
                          <div className="font-medium text-white">{tokenIn.symbol}</div>
                          <div className="text-xs text-gray-400">{tokenIn.name}</div>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-400">Select token...</span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTokenInDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showTokenInDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {availableTokens.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => selectToken(token, true)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-blue-400" />
                          <div className="text-left">
                            <div className="font-medium text-white">{token.symbol}</div>
                            <div className="text-xs text-gray-400">{token.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-white">
                            ${tokenPrices[token.symbol]?.toLocaleString() || 'Loading...'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={swapTokens}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <ArrowUpDown className="w-4 h-4 text-gray-300" />
              </button>
            </div>

            {/* To Token */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">To Token</label>
              <div className="relative">
                <button
                  onClick={() => setShowTokenOutDropdown(!showTokenOutDropdown)}
                  className="w-full flex items-center justify-between p-3 bg-gray-800/50 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {tokenOut ? (
                      <>
                        <Coins className="w-5 h-5 text-green-400" />
                        <div className="text-left">
                          <div className="font-medium text-white">{tokenOut.symbol}</div>
                          <div className="text-xs text-gray-400">{tokenOut.name}</div>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-400">Select token...</span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTokenOutDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showTokenOutDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {availableTokens.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => selectToken(token, false)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-green-400" />
                          <div className="text-left">
                            <div className="font-medium text-white">{token.symbol}</div>
                            <div className="text-xs text-gray-400">{token.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-white">
                            ${tokenPrices[token.symbol]?.toLocaleString() || 'Loading...'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:border-orange-500 focus:outline-none text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Search Routes Button */}
          <button
            onClick={searchBestRoutes}
            disabled={!tokenIn || !tokenOut || !amount || isSearchingRoutes}
            className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 rounded-lg font-medium text-white transition-colors"
          >
            {isSearchingRoutes ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Searching Best Routes...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Find Best Route
              </>
            )}
          </button>

          {/* Best Route Display */}
          {bestRoute && (
            <div className="border border-green-500/30 rounded-lg p-4 bg-green-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Route className="w-5 h-5 text-green-400" />
                <span className="font-medium text-green-400">Best Route Found!</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Route:</span>
                  <span className="text-white">{tokenIn?.symbol} → {tokenOut?.symbol} via {bestRoute.dex}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">You Get:</span>
                  <span className="text-green-400 font-medium">{bestRoute.outputAmount.toFixed(6)} {tokenOut?.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price Impact:</span>
                  <span className="text-yellow-400">{bestRoute.priceImpact.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Fees:</span>
                  <span className="text-orange-400">{bestRoute.fee.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Est. Time:</span>
                  <span className="text-blue-400">{bestRoute.estimatedTime}</span>
                </div>
              </div>

              <button
                onClick={() => executeRoute(bestRoute)}
                className="w-full mt-4 flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-lg font-medium text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Execute Trade on {bestRoute.dex}
              </button>
            </div>
          )}

          {/* All Routes */}
          {allRoutes.length > 1 && (
            <div>
              <h5 className="text-sm font-medium text-gray-300 mb-2">All Available Routes</h5>
              <div className="space-y-2">
                {allRoutes.map((route, index) => (
                  <div
                    key={route.dex}
                    className={`border rounded-lg p-3 ${
                      index === 0 
                        ? 'border-green-500/30 bg-green-500/5' 
                        : 'border-gray-600/30 bg-gray-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{route.dex}</span>
                        {index === 0 && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">BEST</span>}
                      </div>
                      <button
                        onClick={() => executeRoute(route)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Use This Route
                      </button>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Output: {route.outputAmount.toFixed(6)} {tokenOut?.symbol}</span>
                      <span>Fee: {route.fee.toFixed(2)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fee Notice */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-orange-400">CYPHER Service Fee: 0.35%</span>
        </div>
        <p className="text-xs text-orange-300/80">
          Fee applied on successful DEX redirections. We find the best routes across all major DEXs.
        </p>
      </div>

    </div>
  );
}