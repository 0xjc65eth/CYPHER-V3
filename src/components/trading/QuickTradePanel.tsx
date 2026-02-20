'use client';

import React, { useState, useEffect } from 'react';

// Declarações de tipos para carteiras Web3
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
    };
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
    };
  }
}
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowUpDown, Zap, ExternalLink, AlertTriangle, CheckCircle,
  TrendingUp, Coins, Clock, Shield, Target, BarChart3, Loader2,
  RefreshCw, Eye, DollarSign, Fuel, Network, ChevronDown,
  Info, Star, Sparkles, Activity, Calculator, Wallet
} from 'lucide-react';
import { FeeExplanationModal } from './FeeExplanationModal';
import { useWallet } from '@/contexts/WalletContext';
// Import direto do arquivo para evitar problemas
import { useWalletDetection } from '@/hooks';
import { QuickTradeWallet } from '@/components/wallet/QuickTradeWallet';
import { QuickTradeCalculator, type TradeCalculation, type TradeValidation } from '@/lib/services/QuickTradeCalculator';

interface ExchangeQuote {
  name: string;
  network: 'ethereum' | 'arbitrum' | 'optimism' | 'polygon' | 'base' | 'avalanche' | 'bsc' | 'solana';
  price: number;
  liquidityUSD: number;
  estimatedGas: number;
  gasUSD: number;
  slippage: number;
  route: string[];
  confidence: number;
  url: string;
}

interface QuickTradeAnalysis {
  fromToken: string;
  toToken: string;
  amount: number;
  bestExchange: ExchangeQuote;
  allQuotes: ExchangeQuote[];
  serviceFee: {
    percentage: number;
    amountUSD: number;
    totalCost: number;
  };
  totalTransactionCost: number;
  estimatedOutput: number;
  priceImpact: number;
  savings: number;
}

// Tokens suportados por rede - LISTA COMPLETA
const SUPPORTED_TOKENS = {
  ethereum: [
    { symbol: 'ETH', name: 'Ethereum', address: 'native', price: 2850, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', price: 1, decimals: 6 },
    { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', price: 1, decimals: 6 },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a760698606B8eE2121c351', price: 110000, decimals: 8 },
    { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', price: 1, decimals: 18 },
    { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', price: 7.5, decimals: 18 },
    { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', price: 15, decimals: 18 },
    { symbol: 'AAVE', name: 'Aave', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', price: 95, decimals: 18 },
    { symbol: 'CRV', name: 'Curve', address: '0xD533a949740bb3306d119CC777fa900bA034cd52', price: 0.6, decimals: 18 },
    { symbol: 'SUSHI', name: 'SushiSwap', address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2', price: 1.2, decimals: 18 }
  ],
  arbitrum: [
    { symbol: 'ETH', name: 'Ethereum', address: 'native', price: 2850, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0xFF970A61A04b1496CfD6E66A7F2e0428A7B', price: 1, decimals: 6 },
    { symbol: 'USDT', name: 'Tether USD', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', price: 1, decimals: 6 },
    { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1e0d023ec7E279e0F5E57e8E79', price: 1.2, decimals: 18 },
    { symbol: 'GMX', name: 'GMX', address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', price: 45, decimals: 18 },
    { symbol: 'RDNT', name: 'Radiant', address: '0x3082CC23568eA640225c2467653dB90e9250AaA0', price: 0.08, decimals: 18 },
    { symbol: 'MAGIC', name: 'Magic', address: '0x539bdE0d7Dbd336b79148AA742883198BBF60342', price: 0.95, decimals: 18 },
    { symbol: 'DPX', name: 'Dopex', address: '0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55', price: 250, decimals: 18 },
    { symbol: 'VELA', name: 'Vela', address: '0x088cd8f5eF3652623c22D48b1605DCfE860Cd704', price: 2.5, decimals: 18 },
    { symbol: 'GRAIL', name: 'Grail', address: '0x3d9907F9a368ad0a51Be60f7Da3b97cf940982D8', price: 1200, decimals: 18 }
  ],
  optimism: [
    { symbol: 'ETH', name: 'Ethereum', address: 'native', price: 2850, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0x7F5c764cBc14f9e7F2C5D3371B5c7005e9266DA72', price: 1, decimals: 6 },
    { symbol: 'USDT', name: 'Tether USD', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', price: 1, decimals: 6 },
    { symbol: 'OP', name: 'Optimism', address: '0x4200000000000000000000000000000000000042', price: 2.3, decimals: 18 },
    { symbol: 'VELO', name: 'Velodrome', address: '0x3c8B650257cFb5F1679b6d3EccbBBE718bd72421', price: 0.15, decimals: 18 },
    { symbol: 'SNX', name: 'Synthetix', address: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4', price: 3.2, decimals: 18 },
    { symbol: 'PERP', name: 'Perpetual', address: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0', price: 0.85, decimals: 18 },
    { symbol: 'LYRA', name: 'Lyra', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', price: 0.05, decimals: 18 },
    { symbol: 'THALES', name: 'Thales', address: '0x217D47011b23BB961eB6D93cA9945B7501a5BB11', price: 0.12, decimals: 18 },
    { symbol: 'KWENTA', name: 'Kwenta', address: '0x920Cf626a271321C151D027030D5d08aF699456b', price: 45, decimals: 18 }
  ],
  polygon: [
    { symbol: 'MATIC', name: 'Polygon', address: 'native', price: 0.8, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', price: 1, decimals: 6 },
    { symbol: 'USDT', name: 'Tether USD', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', price: 1, decimals: 6 },
    { symbol: 'WETH', name: 'Wrapped ETH', address: '0x7ceB23fD6bC0AdD59E62ac25578270cFf1b9f619', price: 2850, decimals: 18 },
    { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x1bFD67037B42Cf73acF2047067bd4F2C47D9BfD6', price: 110000, decimals: 8 },
    { symbol: 'QUICK', name: 'QuickSwap', address: '0x831753DD7087CaCE078C0636d576B6A542', price: 0.045, decimals: 18 },
    { symbol: 'SAND', name: 'Sandbox', address: '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683', price: 0.65, decimals: 18 },
    { symbol: 'MANA', name: 'Decentraland', address: '0xA1c57f48F0Deb89f569dFbE6E2B7f46D33606fD4', price: 0.55, decimals: 18 },
    { symbol: 'AXS', name: 'Axie Infinity', address: '0x61BDD9C7d4dF4Bf47A4508c0c8245505F2Af5b7b', price: 8.5, decimals: 18 },
    { symbol: 'GHST', name: 'Aavegotchi', address: '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7', price: 1.1, decimals: 18 }
  ],
  base: [
    { symbol: 'ETH', name: 'Ethereum', address: 'native', price: 2850, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', price: 1, decimals: 6 },
    { symbol: 'USDbC', name: 'Bridged USDC', address: '0xd9aAEc86B65D86c3d66D8ce0C6e33', price: 1, decimals: 6 },
    { symbol: 'DAI', name: 'Dai', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', price: 1, decimals: 18 },
    { symbol: 'AERO', name: 'Aerodrome', address: '0x940181a94A35A4169056f0a7F41A0', price: 0.85, decimals: 18 },
    { symbol: 'BRETT', name: 'Brett', address: '0x532f27101965dd16442E59d40670FaF525F0', price: 0.02, decimals: 18 },
    { symbol: 'DEGEN', name: 'Degen', address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', price: 0.008, decimals: 18 },
    { symbol: 'TOSHI', name: 'Toshi', address: '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4', price: 0.001, decimals: 18 },
    { symbol: 'BSWAP', name: 'BaseSwap', address: '0x78a087d713Be963Bf307b18F2Ff8122EF9A63ae9', price: 0.35, decimals: 18 },
    { symbol: 'BLUE', name: 'BlueSwap', address: '0x4158734D47Fc9692176B5085E0F52ee04E2', price: 0.15, decimals: 18 }
  ],
  avalanche: [
    { symbol: 'AVAX', name: 'Avalanche', address: 'native', price: 25, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0xB97EF9Ef8734C71904C8002488e682b522', price: 1, decimals: 6 },
    { symbol: 'USDT', name: 'Tether USD', address: '0x9702230A8Ea53601f5cd2DE3715b200C6e', price: 1, decimals: 6 },
    { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x50b7545627a5162F82A992c33b87aDc75187B218', price: 110000, decimals: 8 },
    { symbol: 'WETH', name: 'Wrapped ETH', address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', price: 2850, decimals: 18 },
    { symbol: 'JOE', name: 'TraderJoe', address: '0x6e84a6216eA6daCC71B8E3Cdeb8b4Fbf4B', price: 0.35, decimals: 18 },
    { symbol: 'PNG', name: 'Pangolin', address: '0x60781C2586D68229fde47564546784ab3fACA982', price: 0.12, decimals: 18 },
    { symbol: 'QI', name: 'Benqi', address: '0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5', price: 0.02, decimals: 18 },
    { symbol: 'XAVA', name: 'Avalaunch', address: '0xd1c3f94DE7e5B45fa4eDBBA472491a9f4B166FC4', price: 0.85, decimals: 18 },
    { symbol: 'GMX', name: 'GMX', address: '0x62edc0692BD897D2295872a9FFCac5425011c661', price: 45, decimals: 18 }
  ],
  bsc: [
    { symbol: 'BNB', name: 'BNB', address: 'native', price: 320, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0x8AC76a51cc950d9846D10dF9Df5F2F5', price: 1, decimals: 18 },
    { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', price: 1, decimals: 18 },
    { symbol: 'BUSD', name: 'Binance USD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', price: 1, decimals: 18 },
    { symbol: 'WETH', name: 'Wrapped ETH', address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', price: 2850, decimals: 18 },
    { symbol: 'CAKE', name: 'PancakeSwap', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e8', price: 2.1, decimals: 18 },
    { symbol: 'BSW', name: 'Biswap', address: '0x965F527D9159dCE6288a2219DB51fc6Ff', price: 0.08, decimals: 18 },
    { symbol: 'XVS', name: 'Venus', address: '0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63', price: 7.5, decimals: 18 },
    { symbol: 'ALPACA', name: 'Alpaca', address: '0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F', price: 0.18, decimals: 18 },
    { symbol: 'BAKE', name: 'BakerySwap', address: '0xE02dF9e3e622DeBdD69fb838bB799E3F168902c5', price: 0.15, decimals: 18 }
  ],
  solana: [
    { symbol: 'SOL', name: 'Solana', address: 'native', price: 95, decimals: 9 },
    { symbol: 'USDC', name: 'USD Coin', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', price: 1, decimals: 6 },
    { symbol: 'USDT', name: 'Tether USD', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', price: 1, decimals: 6 },
    { symbol: 'RAY', name: 'Raydium', address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', price: 2.1, decimals: 6 },
    { symbol: 'ORCA', name: 'Orca', address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', price: 1.8, decimals: 6 },
    { symbol: 'SRM', name: 'Serum', address: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt', price: 0.08, decimals: 6 },
    { symbol: 'MNGO', name: 'Mango', address: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac', price: 0.02, decimals: 6 },
    { symbol: 'STEP', name: 'Step', address: 'StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT', price: 0.03, decimals: 9 },
    { symbol: 'COPE', name: 'Cope', address: '8HGyAAB1yoM1ttS7pXjHMa3dukTFGQggnFFH3hJZgzQh', price: 0.15, decimals: 6 },
    { symbol: 'LIKE', name: 'Only1', address: '3bRTivrVsitbmCTGtqwp7hxXPsybkjn4XLNtPsHqa3zR', price: 0.008, decimals: 9 }
  ]
};

const exchangeLogos = {
  'UNISWAP': '🦄',
  'SUSHISWAP': '🍣',
  '1INCH': '🔮',
  'CAMELOT': '⚔️',
  'GMX': '📈',
  'VELODROME': '🏎️',
  'BEETHOVEN_X': '🎼',
  'QUICKSWAP': '⚡',
  'AERODROME': '✈️',
  'BASESWAP': '🔵',
  'TRADERJOE': '☕',
  'PANGOLIN': '🐧',
  'PANCAKESWAP': '🥞',
  'BISWAP': '🔄',
  'JUPITER': '🪐',
  'ORCA': '🐋',
  'RAYDIUM': '⚡'
};

const networkColors = {
  ethereum: 'border-blue-500 bg-blue-500/10',
  arbitrum: 'border-blue-400 bg-blue-400/10',
  optimism: 'border-red-500 bg-red-500/10',
  polygon: 'border-purple-600 bg-purple-600/10',
  base: 'border-blue-600 bg-blue-600/10',
  avalanche: 'border-red-600 bg-red-600/10',
  bsc: 'border-yellow-500 bg-yellow-500/10',
  solana: 'border-purple-500 bg-purple-500/10'
};

// Function to get token balance
function getTokenBalance(tokenSymbol: string, network: string, userAddress: string): string {
  // For demonstration, return placeholder values
  // In production, this would fetch real balances from blockchain APIs
  
  if (!userAddress) return '0.00';
  
  // Mock balances based on token and network
  const mockBalances: Record<string, Record<string, number>> = {
    ethereum: {
      'ETH': 2.5,
      'USDC': 18772.9759,
      'USDT': 5000.00,
      'WBTC': 0.15,
      'DAI': 10000.00
    },
    arbitrum: {
      'ETH': 1.8,
      'USDC': 25000.00,
      'ARB': 1500.00
    },
    solana: {
      'SOL': 45.2,
      'USDC': 12000.00,
      'RAY': 850.00
    }
  };
  
  const balance = mockBalances[network]?.[tokenSymbol] || 0;
  
  // Format balance based on token type
  if (tokenSymbol === 'USDC' || tokenSymbol === 'USDT' || tokenSymbol === 'DAI') {
    return balance.toFixed(4); // Stablecoins with 4 decimals
  } else if (tokenSymbol === 'ETH' || tokenSymbol === 'SOL' || tokenSymbol === 'BTC') {
    return balance.toFixed(8); // Main tokens with 8 decimals
  } else {
    return balance.toFixed(6); // Other tokens with 6 decimals
  }
}

// Exchanges suportadas por rede (definição no frontend)
const SUPPORTED_EXCHANGES = {
  ethereum: [
    { name: 'UNISWAP', logo: '🦄' },
    { name: 'SUSHISWAP', logo: '🍣' },
    { name: '1INCH', logo: '🔮' }
  ],
  arbitrum: [
    { name: 'UNISWAP', logo: '🦄' },
    { name: 'SUSHISWAP', logo: '🍣' },
    { name: 'CAMELOT', logo: '⚔️' },
    { name: 'GMX', logo: '📈' }
  ],
  optimism: [
    { name: 'UNISWAP', logo: '🦄' },
    { name: 'VELODROME', logo: '🏎️' },
    { name: 'BEETHOVEN_X', logo: '🎼' }
  ],
  polygon: [
    { name: 'UNISWAP', logo: '🦄' },
    { name: 'QUICKSWAP', logo: '⚡' },
    { name: 'SUSHISWAP', logo: '🍣' }
  ],
  base: [
    { name: 'UNISWAP', logo: '🦄' },
    { name: 'AERODROME', logo: '✈️' },
    { name: 'BASESWAP', logo: '🔵' }
  ],
  avalanche: [
    { name: 'UNISWAP', logo: '🦄' },
    { name: 'TRADERJOE', logo: '☕' },
    { name: 'PANGOLIN', logo: '🐧' }
  ],
  bsc: [
    { name: 'UNISWAP', logo: '🦄' },
    { name: 'PANCAKESWAP', logo: '🥞' },
    { name: 'BISWAP', logo: '🔄' }
  ],
  solana: [
    { name: 'JUPITER', logo: '🪐' },
    { name: 'ORCA', logo: '🐋' },
    { name: 'RAYDIUM', logo: '⚡' }
  ]
};

const networkLabels = {
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  polygon: 'Polygon',
  base: 'Base',
  avalanche: 'Avalanche',
  bsc: 'BSC',
  solana: 'Solana'
};

export function QuickTradePanel() {
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState<'ethereum' | 'arbitrum' | 'optimism' | 'polygon' | 'base' | 'avalanche' | 'bsc' | 'solana'>('ethereum');
  const [analysis, setAnalysis] = useState<QuickTradeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'input' | 'analyzing' | 'results' | 'processing' | 'redirecting'>('input');
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({});
  const [tradeCalculation, setTradeCalculation] = useState<TradeCalculation | null>(null);
  const [tradeValidation, setTradeValidation] = useState<TradeValidation | null>(null);

  const wallet = useWallet();
  const { 
    hasEthereum, 
    hasSolana, 
    connectEthereum, 
    connectSolana, 
    switchNetwork,
    isLoading: walletsLoading 
  } = useWalletDetection();

  // Use real wallet data when available
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      setUserAddress(wallet.address);
    }
  }, [wallet.isConnected, wallet.address]);

  const availableTokens = SUPPORTED_TOKENS[network];
  
  // Initialize calculator
  const calculator = new QuickTradeCalculator(10); // $10 minimum

  // Conectar carteira EVM usando hook otimizado
  const connectEVMWallet = async () => {
    try {
      if (!hasEthereum) {
        alert('Nenhuma carteira EVM detectada! Instale MetaMask ou outra carteira compatível.');
        window.open('https://metamask.io/', '_blank');
        return;
      }

      const address = await connectEthereum();
      
      if (address) {
        setUserAddress(address);
        
        // Trocar para rede correta se necessário
        const networkConfig = {
          ethereum: '0x1',
          arbitrum: '0xa4b1',
          optimism: '0xa',
          polygon: '0x89',
          base: '0x2105',
          avalanche: '0xa86a',
          bsc: '0x38'
        };

        const chainId = networkConfig[network as keyof typeof networkConfig];
        if (chainId) {
          await switchNetwork(chainId);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao conectar carteira EVM:', error);
      alert('Erro ao conectar carteira. Tente colar seu endereço manualmente.');
    }
  };

  // Conectar carteira Solana usando hook otimizado
  const connectSolanaWallet = async () => {
    try {
      if (!hasSolana) {
        alert('Nenhuma carteira Solana detectada! Instale Phantom ou outra carteira compatível.');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const address = await connectSolana();
      
      if (address) {
        setUserAddress(address);
      }
    } catch (error) {
      console.error('❌ Erro ao conectar carteira Solana:', error);
      alert('Erro ao conectar carteira. Tente colar seu endereço manualmente.');
    }
  };


  const analyzeTradeOpportunity = async () => {
    
    // Use QuickTradeCalculator for validation
    if (!tradeValidation || !tradeValidation.isValid) {
      const errors = tradeValidation?.errors || ['Valor inválido'];
      alert(errors.join('\n'));
      return;
    }
    
    const fromTokenData = availableTokens.find(t => t.symbol === fromToken);
    if (!fromTokenData) {
      alert('Token não encontrado');
      return;
    }

    if (!userAddress) {
      alert('Por favor, insira o endereço da sua carteira');
      return;
    }

    setLoading(true);
    setStep('analyzing');

    try {
      
      const response = await fetch('/api/quick-trade/analyze/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          fromToken,
          toToken,
          amount: parseFloat(amount),
          network
        })
      });

      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data.data);
        setStep('results');
      } else {
        console.error('❌ Erro na resposta:', data.error);
        alert('Erro na análise: ' + data.error);
        setStep('input');
      }
    } catch (error) {
      console.error('💥 Erro na análise:', error);
      alert(`Erro na comunicação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const executeTradeRedirect = async () => {
    if (!analysis || !userAddress) {
      alert('Conecte sua carteira primeiro');
      return;
    }

    setProcessing(true);
    setStep('processing');

    try {
      const response = await fetch('/api/quick-trade/process/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: Date.now().toString(),
          userAddress,
          selectedExchange: analysis.bestExchange.name,
          network,
          fromToken,
          toToken,
          amount: analysis.amount,
          acceptedFee: analysis.serviceFee.amountUSD
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setStep('redirecting');
        
        // Aguardar 3 segundos antes do redirect
        setTimeout(() => {
          window.open(data.data.redirectUrl, '_blank');
          setStep('input');
          setAnalysis(null);
          setAmount('');
        }, 3000);
      } else {
        alert('Erro no processamento: ' + data.error);
        setStep('results');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro no processamento do trade');
      setStep('results');
    } finally {
      setProcessing(false);
    }
  };

  const resetTrade = () => {
    setStep('input');
    setAnalysis(null);
    setAmount('');
    setLoading(false);
    setProcessing(false);
  };

  const swapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    // Recalculate after swap
    validateAndCalculateTrade(amount, toToken, fromToken);
  };

  // Real-time trade validation and calculation
  const validateAndCalculateTrade = (inputAmount: string, fromSymbol: string, toSymbol: string) => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      setTradeCalculation(null);
      setTradeValidation(null);
      return;
    }

    const fromTokenData = availableTokens.find(t => t.symbol === fromSymbol);
    if (!fromTokenData) return;

    const amountNum = parseFloat(inputAmount);
    const usdValue = amountNum * fromTokenData.price;

    // Calculate trade
    const calculation = calculator.calculateAssetAmount(fromTokenData.price, usdValue);
    setTradeCalculation(calculation);

    // Validate trade
    const validation = calculator.validateTrade(fromSymbol, amountNum, fromTokenData.price);
    setTradeValidation(validation);
  };

  // Update validation when amount or tokens change
  React.useEffect(() => {
    validateAndCalculateTrade(amount, fromToken, toToken);
  }, [amount, fromToken, toToken, network]);

  return (
    <div>
    <Card className="bg-gray-900 border-gray-700">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Quick Trade</h2>
              <p className="text-sm text-gray-400">Melhor execução cross-DEX</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600 text-white">
              0.05% Fee
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFeeModal(true)}
              className="text-green-400 hover:text-green-300 p-1"
            >
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Network Selector - Scrollable Grid */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Select Network</h3>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(networkLabels) as Array<keyof typeof networkLabels>).map((net) => (
              <Button
                key={net}
                variant={network === net ? 'default' : 'outline'}
                onClick={() => {
                  setNetwork(net);
                  // Reset tokens when changing network
                  const tokens = SUPPORTED_TOKENS[net];
                  setFromToken(tokens[0].symbol);
                  setToToken(tokens[1].symbol);
                }}
                className={`text-xs p-2 h-auto ${network === net ? networkColors[net] : 'border-gray-600'}`}
              >
                <div className="text-center">
                  <Network className="w-3 h-3 mx-auto mb-1" />
                  <div>{networkLabels[net]}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {step === 'input' && (
          <div className="space-y-6">
            {/* Token Selection */}
            <div className="space-y-4">
              {/* From Token */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Você paga</span>
                  <span className="text-sm text-gray-400">
                    Balance: {getTokenBalance(fromToken, network, userAddress)} {fromToken}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="flex-1 bg-transparent text-2xl font-bold text-white outline-none"
                  />
                  <select
                    value={fromToken}
                    onChange={(e) => setFromToken(e.target.value)}
                    className="bg-gray-700 rounded px-3 py-2 text-white border border-gray-600"
                  >
                    {availableTokens.map(token => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.symbol}
                      </option>
                    ))}
                  </select>
                </div>
                {amount && (
                  <div className="space-y-1 mt-2">
                    <div className={`text-sm mt-1 ${tradeValidation?.isValid ? 'text-green-400' : 'text-red-400'}`}>
                      ≈ ${(parseFloat(amount || '0') * (availableTokens.find(t => t.symbol === fromToken)?.price || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </div>
                    
                    {/* Validation feedback */}
                    {tradeValidation && !tradeValidation.isValid && (
                      <div className="text-xs text-red-400">
                        {tradeValidation.errors[0]}
                      </div>
                    )}
                    
                    {tradeValidation && tradeValidation.isValid && tradeCalculation && (
                      <div className="text-xs text-green-400">
                        ✅ Válido - Precisão: {tradeCalculation.decimals} decimais
                      </div>
                    )}
                    
                    {tradeValidation?.warnings && tradeValidation.warnings.length > 0 && (
                      <div className="text-xs text-yellow-400">
                        ⚠️ {tradeValidation.warnings[0]}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={swapTokens}
                  className="rounded-full p-2 border-gray-600 hover:bg-gray-700"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </div>

              {/* To Token */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Você recebe</span>
                  <span className="text-sm text-gray-400">
                    Balance: {getTokenBalance(toToken, network, userAddress)} {toToken}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-2xl font-bold text-gray-500">
                    {amount ? (parseFloat(amount) * 0.998).toFixed(4) : '0.0'}
                  </div>
                  <select
                    value={toToken}
                    onChange={(e) => setToToken(e.target.value)}
                    className="bg-gray-700 rounded px-3 py-2 text-white border border-gray-600"
                  >
                    {availableTokens.filter(t => t.symbol !== fromToken).map(token => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Fractional Trading Examples */}
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-white">Exemplos de Fracionamento</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-orange-400 font-medium">$10 em BTC</div>
                  <div className="text-gray-300">≈ 0.000157 BTC</div>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-blue-400 font-medium">$10 em ETH</div>
                  <div className="text-gray-300">≈ 0.00435 ETH</div>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-green-400 font-medium">$10 em USDC</div>
                  <div className="text-gray-300">= 10.0000 USDC</div>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-purple-400 font-medium">$50 em SOL</div>
                  <div className="text-gray-300">≈ 0.500 SOL</div>
                </div>
              </div>
              
              <div className="text-xs text-gray-400 mt-2 text-center">
                ✅ Precisão automática baseada no preço do ativo
              </div>
            </div>

            {/* Unified Wallet Connection */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-white">Conectar Carteira Real</span>
              </div>
              
              <QuickTradeWallet 
                onWalletConnect={(address, networkType) => {
                  setUserAddress(address);
                }}
                selectedNetwork={network}
              />
              
              {!wallet.isConnected && (
                <div className="mt-3">
                  <div className="text-xs text-gray-400 text-center mb-2">
                    Ou cole seu endereço manualmente:
                  </div>
                  <input
                    type="text"
                    value={userAddress}
                    onChange={(e) => setUserAddress(e.target.value)}
                    placeholder={network === 'solana' 
                      ? 'Cole seu endereço Solana aqui...' 
                      : 'Cole seu endereço EVM aqui...'
                    }
                    className="w-full bg-gray-700 rounded px-3 py-2 text-white text-sm border border-gray-600 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Analyze Button - ENHANCED: Uses QuickTradeCalculator validation */}
            <Button
              onClick={analyzeTradeOpportunity}
              disabled={!tradeValidation?.isValid || !userAddress || loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Analisando...' : 'Analisar Melhor Execução'}
            </Button>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="text-center py-8">
            <div className="relative">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <BarChart3 className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Analisando DEXs</h3>
              <p className="text-gray-400 mb-4">Encontrando a melhor execução para seu trade</p>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando liquidez em {SUPPORTED_EXCHANGES[network]?.length || 0} exchanges...
                </div>
                <Progress value={65} className="w-full max-w-xs mx-auto" />
              </div>
            </div>
          </div>
        )}

        {step === 'results' && analysis && (
          <div className="space-y-6">
            {/* Best Exchange Card */}
            <Card className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border-green-500/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {exchangeLogos[analysis.bestExchange.name as keyof typeof exchangeLogos]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{analysis.bestExchange.name}</h3>
                    <p className="text-sm text-green-400">Melhor execução encontrada</p>
                  </div>
                </div>
                <Badge className="bg-green-600 text-white">
                  {analysis.bestExchange.confidence.toFixed(0)}% Conf.
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Preço de Execução</div>
                  <div className="text-xl font-bold text-white">
                    ${analysis.bestExchange.price.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Você Recebe</div>
                  <div className="text-xl font-bold text-green-400">
                    {analysis.estimatedOutput.toFixed(4)} {toToken}
                  </div>
                </div>
              </div>
            </Card>

            {/* Cost Breakdown */}
            <Card className="bg-gray-800 border-gray-700 p-4">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Detalhamento de Custos
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Valor da Transação:</span>
                  <span className="text-white">${analysis.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taxa de Rede:</span>
                  <span className="text-white">${analysis.bestExchange.gasUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taxa Quick Trade (0.05%):</span>
                  <span className="text-orange-400">${analysis.serviceFee.amountUSD.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Slippage Estimado:</span>
                  <span className="text-yellow-400">{analysis.bestExchange.slippage.toFixed(2)}%</span>
                </div>
                <hr className="border-gray-600" />
                <div className="flex justify-between font-semibold">
                  <span className="text-white">Custo Total:</span>
                  <span className="text-white">${analysis.totalTransactionCost.toFixed(2)}</span>
                </div>
                {analysis.savings > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Economia vs Pior Opção:</span>
                    <span>${analysis.savings.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* All Quotes */}
            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Todas as Cotações
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllQuotes(!showAllQuotes)}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAllQuotes ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              
              {showAllQuotes && (
                <div className="space-y-2">
                  {analysis.allQuotes.map((quote, index) => (
                    <div key={quote.name} className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {exchangeLogos[quote.name as keyof typeof exchangeLogos]}
                        </span>
                        <div>
                          <div className="font-medium text-white">{quote.name}</div>
                          <div className="text-xs text-gray-400">
                            Liquidez: ${(quote.liquidityUSD / 1000000).toFixed(1)}M
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white">${quote.price.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">
                          Gas: ${quote.gasUSD.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={resetTrade}
                className="flex-1 border-gray-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Nova Análise
              </Button>
              <Button
                onClick={executeTradeRedirect}
                disabled={processing}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Executar em {analysis.bestExchange.name}
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-4 border-green-500/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <Shield className="w-6 h-6 text-green-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Processando Trade</h3>
            <p className="text-gray-400">Configurando redirecionamento seguro...</p>
          </div>
        )}

        {step === 'redirecting' && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Redirecionando...</h3>
            <p className="text-gray-400 mb-4">
              Abrindo {analysis?.bestExchange.name} em nova aba
            </p>
            <div className="bg-blue-900/50 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-left">
                  <p className="text-blue-200 text-sm font-medium mb-1">Próximos Passos:</p>
                  <ol className="text-blue-200 text-sm space-y-1">
                    <li>1. Complete sua transação na exchange</li>
                    <li>2. Nossa taxa será coletada automaticamente</li>
                    <li>3. Você receberá confirmação por email</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">CYPHER Quick Trade</span>
          </div>
          <p className="text-xs text-gray-400">
            Sistema de intermediação inteligente que encontra a melhor execução cross-DEX.
            Taxa de serviço transparente de 0.05% sobre o valor da transação.
          </p>
        </div>
      </div>
    </Card>

    {/* Fee Explanation Modal */}
    <FeeExplanationModal 
      isOpen={showFeeModal} 
      onClose={() => setShowFeeModal(false)} 
    />
    </div>
  );
}