'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePremium } from '@/contexts/PremiumContext';
import { useEthWallet } from '@/hooks/useEthWallet';
import { CYPHER_FEE_CONFIG } from '@/config/feeWallets';
import {
  ArrowRightLeft,
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  Clock,
  Zap,
  Shield,
  ExternalLink,
  Copy,
  Check,
  TrendingUp,
  Coins,
  History,
  Percent,
  Droplets,
  Wallet,
  Globe,
  Settings,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function toSmallestUnit(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

// ============================================================================
// Network / Chain Configuration
// ============================================================================

type SwapNetwork = 'thorchain' | 'solana' | 'evm';

interface NetworkConfig {
  id: SwapNetwork;
  name: string;
  label: string;
  color: string;
  icon: string;
  description: string;
  feeBps: number;
  feeLabel: string;
  walletLabel: string;
}

const NETWORKS: NetworkConfig[] = [
  {
    id: 'thorchain',
    name: 'THORChain',
    label: 'Cross-Chain',
    color: '#33FF99',
    icon: '\u26a1',
    description: 'Native cross-chain swaps. No bridges, no wrapped tokens.',
    feeBps: CYPHER_FEE_CONFIG.thorchainAffiliateBps,
    feeLabel: '0.5% affiliate',
    walletLabel: 'Any wallet',
  },
  {
    id: 'solana',
    name: 'Solana',
    label: 'Solana',
    color: '#9945FF',
    icon: '\u25ce',
    description: 'Jupiter aggregator. 1000+ tokens, fastest execution.',
    feeBps: CYPHER_FEE_CONFIG.jupiterPlatformBps,
    feeLabel: '0.35% platform fee',
    walletLabel: 'Phantom / Solflare',
  },
  {
    id: 'evm',
    name: 'EVM',
    label: 'Ethereum / L2',
    color: '#627EEA',
    icon: '\u039e',
    description: 'Best rate across 1inch & Paraswap. ETH, ARB, BASE, OP, MATIC.',
    feeBps: CYPHER_FEE_CONFIG.swapFeeBps,
    feeLabel: '0.3% referrer fee',
    walletLabel: 'MetaMask / WalletConnect',
  },
];

// ============================================================================
// Token Lists per Network
// ============================================================================

interface TokenInfo {
  symbol: string;
  name: string;
  icon: string;
  color: string;
  chain: string;
  mint?: string; // Solana mint address
  address?: string; // EVM contract address
  decimals?: number;
  coingeckoId?: string;
}

const THORCHAIN_TOKENS: TokenInfo[] = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '\u20bf', color: '#F7931A', chain: 'Bitcoin', coingeckoId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', icon: '\u039e', color: '#627EEA', chain: 'Ethereum', coingeckoId: 'ethereum' },
  { symbol: 'USDT', name: 'Tether', icon: '\u20ae', color: '#26A17B', chain: 'Ethereum', coingeckoId: 'tether' },
  { symbol: 'USDC', name: 'USD Coin', icon: '$', color: '#2775CA', chain: 'Ethereum', coingeckoId: 'usd-coin' },
  { symbol: 'AVAX', name: 'Avalanche', icon: 'A', color: '#E84142', chain: 'Avalanche', coingeckoId: 'avalanche-2' },
  { symbol: 'BNB', name: 'BNB', icon: 'B', color: '#F3BA2F', chain: 'BSC', coingeckoId: 'binancecoin' },
  { symbol: 'ATOM', name: 'Cosmos', icon: '\u269b', color: '#2E3148', chain: 'Cosmos', coingeckoId: 'cosmos' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: '\u00d0', color: '#C2A633', chain: 'Dogecoin', coingeckoId: 'dogecoin' },
  { symbol: 'LTC', name: 'Litecoin', icon: '\u0141', color: '#BFBBBB', chain: 'Litecoin', coingeckoId: 'litecoin' },
];

const SOLANA_TOKENS: TokenInfo[] = [
  { symbol: 'SOL', name: 'Solana', icon: '\u25ce', color: '#9945FF', chain: 'Solana', mint: 'So11111111111111111111111111111111111111112', decimals: 9, coingeckoId: 'solana' },
  { symbol: 'USDC', name: 'USD Coin', icon: '$', color: '#2775CA', chain: 'Solana', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, coingeckoId: 'usd-coin' },
  { symbol: 'USDT', name: 'Tether', icon: '\u20ae', color: '#26A17B', chain: 'Solana', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, coingeckoId: 'tether' },
  { symbol: 'BONK', name: 'Bonk', icon: '\ud83d\udc36', color: '#F2A900', chain: 'Solana', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, coingeckoId: 'bonk' },
  { symbol: 'JUP', name: 'Jupiter', icon: 'J', color: '#6EE7B7', chain: 'Solana', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, coingeckoId: 'jupiter-exchange-solana' },
  { symbol: 'mSOL', name: 'Marinade SOL', icon: 'M', color: '#8B5CF6', chain: 'Solana', mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', decimals: 9, coingeckoId: 'msol' },
];

const EVM_TOKENS: TokenInfo[] = [
  { symbol: 'ETH', name: 'Ethereum', icon: '\u039e', color: '#627EEA', chain: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, coingeckoId: 'ethereum' },
  { symbol: 'USDC', name: 'USD Coin', icon: '$', color: '#2775CA', chain: 'Ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, coingeckoId: 'usd-coin' },
  { symbol: 'USDT', name: 'Tether', icon: '\u20ae', color: '#26A17B', chain: 'Ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, coingeckoId: 'tether' },
  { symbol: 'WBTC', name: 'Wrapped BTC', icon: '\u20bf', color: '#F7931A', chain: 'Ethereum', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, coingeckoId: 'wrapped-bitcoin' },
  { symbol: 'DAI', name: 'Dai', icon: 'D', color: '#F5AC37', chain: 'Ethereum', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, coingeckoId: 'dai' },
  { symbol: 'ARB', name: 'Arbitrum', icon: 'A', color: '#28A0F0', chain: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, coingeckoId: 'arbitrum' },
];

const EVM_CHAINS: { id: number; name: string; color: string }[] = [
  { id: 1, name: 'Ethereum', color: '#627EEA' },
  { id: 42161, name: 'Arbitrum', color: '#28A0F0' },
  { id: 8453, name: 'Base', color: '#0052FF' },
  { id: 10, name: 'Optimism', color: '#FF0420' },
  { id: 137, name: 'Polygon', color: '#8247E5' },
  { id: 56, name: 'BSC', color: '#F3BA2F' },
];

function getTokensForNetwork(network: SwapNetwork): TokenInfo[] {
  switch (network) {
    case 'solana': return SOLANA_TOKENS;
    case 'evm': return EVM_TOKENS;
    default: return THORCHAIN_TOKENS;
  }
}

// ============================================================================
// Types
// ============================================================================

interface SwapQuote {
  expectedOutput: string;
  expectedOutputUsd: number;
  fees: {
    network: string;
    networkUsd: number;
    affiliate: string;
    affiliateUsd: number;
    total: string;
    totalUsd: number;
  };
  slippageBps: number;
  estimatedTime: number;
  route: string;
  inboundAddress: string;
  memo: string;
  warningMessage?: string;
  expiry: number;
}

interface QuoteResponse {
  success: boolean;
  error?: string;
  input?: { asset: string; amount: string; amountUsd: number; chain: string };
  output?: { asset: string; chain: string };
  quote?: SwapQuote;
  affiliate?: { code: string; feeBps: number; feePercent: string; isPremium?: boolean };
  // For Solana/EVM routes
  chain?: string;
  provider?: string;
  bestProvider?: string;
  fee?: { feeBps: number; feeWallet: string; isPremium: boolean; collection: string; description: string };
}

type SwapStatus = 'idle' | 'quoting' | 'quoted' | 'confirming' | 'broadcasting' | 'pending' | 'success' | 'error';

interface SwapHistoryItem {
  id: number;
  date: string;
  fromAsset: string;
  toAsset: string;
  fromAmount: string;
  toAmount: string;
  status: string;
  txHash: string;
}

// THORChain Savers Vault pools
const EARN_POOLS = [
  { asset: 'BTC', name: 'BTC Savers Vault', apy: 'Variable', tvl: 'Live', minDeposit: '0.001 BTC', icon: '\u20bf', color: '#F7931A' },
  { asset: 'ETH', name: 'ETH Savers Vault', apy: 'Variable', tvl: 'Live', minDeposit: '0.01 ETH', icon: '\u039e', color: '#627EEA' },
  { asset: 'USDC', name: 'USDC Savers Vault', apy: 'Variable', tvl: 'Live', minDeposit: '10 USDC', icon: '$', color: '#2775CA' },
  { asset: 'AVAX', name: 'AVAX Savers Vault', apy: 'Variable', tvl: 'Live', minDeposit: '0.5 AVAX', icon: 'A', color: '#E84142' },
  { asset: 'RUNE', name: 'RUNE LP Pool', apy: 'Variable', tvl: 'Live', minDeposit: '10 RUNE', icon: '\u26a1', color: '#33FF99' },
];

// ============================================================================
// Wallet Helpers
// ============================================================================

function useSolanaWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Check if already connected
    const phantom = (window as any)?.solana;
    if (phantom?.isPhantom && phantom.isConnected && phantom.publicKey) {
      setAddress(phantom.publicKey.toString());
    }
  }, []);

  const connect = useCallback(async () => {
    const phantom = (window as any)?.solana;
    if (!phantom?.isPhantom) {
      throw new Error('Phantom wallet not found. Please install Phantom.');
    }
    setConnecting(true);
    try {
      const resp = await phantom.connect();
      const addr = resp.publicKey.toString();
      setAddress(addr);
      return addr;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const phantom = (window as any)?.solana;
    if (phantom) await phantom.disconnect();
    setAddress(null);
  }, []);

  return { address, isConnected: !!address, connecting, connect, disconnect };
}

// ============================================================================
// Main Component
// ============================================================================

export default function SwapPage() {
  const { isPremium } = usePremium();
  const ethWallet = useEthWallet();
  const solWallet = useSolanaWallet();

  // Network state
  const [activeNetwork, setActiveNetwork] = useState<SwapNetwork>('thorchain');
  const [evmChainId, setEvmChainId] = useState(1);
  const [showEvmChainDropdown, setShowEvmChainDropdown] = useState(false);

  // Token state
  const tokens = getTokensForNetwork(activeNetwork);
  const [fromAsset, setFromAsset] = useState<TokenInfo>(tokens[0]);
  const [toAsset, setToAsset] = useState<TokenInfo>(tokens[1]);
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [showSlippage, setShowSlippage] = useState(false);

  // Quote state
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [usdPrices, setUsdPrices] = useState<Record<string, number>>({});
  const [swapHistory, setSwapHistory] = useState<SwapHistoryItem[]>([]);

  // Reset tokens when network changes
  useEffect(() => {
    const newTokens = getTokensForNetwork(activeNetwork);
    setFromAsset(newTokens[0]);
    setToAsset(newTokens[1] || newTokens[0]);
    setQuote(null);
    setError(null);
    setStatus('idle');
    setAmount('');
  }, [activeNetwork]);

  // Fetch swap history with AbortController to prevent race conditions
  useEffect(() => {
    const controller = new AbortController();
    async function fetchHistory() {
      try {
        const res = await fetch('/api/fees/history/?limit=20', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.records && Array.isArray(data.records)) {
            setSwapHistory(data.records.map((r: any, i: number) => ({
              id: i + 1,
              date: new Date(r.timestamp || r.created_at).toLocaleString(),
              fromAsset: r.from_token || r.fromToken || '?',
              toAsset: r.to_token || r.toToken || '?',
              fromAmount: r.trade_amount_usd?.toFixed(2) || '0',
              toAmount: r.fee_amount?.toFixed(6) || '0',
              status: r.status || 'pending',
              txHash: r.tx_hash || r.txHash || '-',
            })));
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return; // Expected on cleanup
      }
    }
    fetchHistory();
    return () => controller.abort(); // Cleanup: cancel pending request on unmount
  }, []);

  // Fetch USD prices with AbortController, caching, and auto-refresh (60s)
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const FALLBACK_PRICES: Record<string, number> = {
      'BTC': 97000, 'ETH': 3200, 'USDT': 1, 'USDC': 1, 'AVAX': 35,
      'BNB': 600, 'ATOM': 9, 'DOGE': 0.32, 'LTC': 100, 'SOL': 180,
      'BONK': 0.000025, 'JUP': 0.8, 'mSOL': 200, 'WBTC': 97000, 'DAI': 1, 'ARB': 0.8,
    };

    async function fetchPrices() {
      try {
        const ids = 'bitcoin,ethereum,tether,usd-coin,avalanche-2,binancecoin,cosmos,dogecoin,litecoin,solana,bonk,jupiter-exchange-solana,msol,wrapped-bitcoin,dai,arbitrum';
        const res = await fetch(
          `/api/coingecko/simple/price?ids=${ids}&vs_currencies=usd`,
          { signal: controller.signal }
        );
        if (res.ok && isMounted) {
          const data = await res.json();
          setUsdPrices({
            'BTC': data.bitcoin?.usd || FALLBACK_PRICES.BTC,
            'ETH': data.ethereum?.usd || FALLBACK_PRICES.ETH,
            'USDT': data.tether?.usd || FALLBACK_PRICES.USDT,
            'USDC': data['usd-coin']?.usd || FALLBACK_PRICES.USDC,
            'AVAX': data['avalanche-2']?.usd || FALLBACK_PRICES.AVAX,
            'BNB': data.binancecoin?.usd || FALLBACK_PRICES.BNB,
            'ATOM': data.cosmos?.usd || FALLBACK_PRICES.ATOM,
            'DOGE': data.dogecoin?.usd || FALLBACK_PRICES.DOGE,
            'LTC': data.litecoin?.usd || FALLBACK_PRICES.LTC,
            'SOL': data.solana?.usd || FALLBACK_PRICES.SOL,
            'BONK': data.bonk?.usd || FALLBACK_PRICES.BONK,
            'JUP': data['jupiter-exchange-solana']?.usd || FALLBACK_PRICES.JUP,
            'mSOL': data.msol?.usd || FALLBACK_PRICES.mSOL,
            'WBTC': data['wrapped-bitcoin']?.usd || FALLBACK_PRICES.WBTC,
            'DAI': data.dai?.usd || FALLBACK_PRICES.DAI,
            'ARB': data.arbitrum?.usd || FALLBACK_PRICES.ARB,
          });
        } else if (res.status === 429 && isMounted) {
          // Rate limited by CoinGecko - use fallback
          setUsdPrices(FALLBACK_PRICES);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (isMounted) {
          setUsdPrices(FALLBACK_PRICES);
        }
      }
    }

    fetchPrices();
    // Auto-refresh prices every 60 seconds (respects CoinGecko rate limit)
    const interval = setInterval(fetchPrices, 60000);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const networkConfig = NETWORKS.find(n => n.id === activeNetwork)!;
  const inputUsd = amount ? parseFloat(amount) * (usdPrices[fromAsset.symbol] || 0) : 0;

  // Check wallet connection status for active network
  const isWalletConnected = activeNetwork === 'evm' ? ethWallet.isConnected
    : activeNetwork === 'solana' ? solWallet.isConnected
    : true; // THORChain doesn't need pre-connection

  const walletAddress = activeNetwork === 'evm' ? ethWallet.address
    : activeNetwork === 'solana' ? solWallet.address
    : null;

  const handleConnectWallet = useCallback(async () => {
    try {
      if (activeNetwork === 'evm') {
        await ethWallet.connectEth();
      } else if (activeNetwork === 'solana') {
        await solWallet.connect();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  }, [activeNetwork, ethWallet, solWallet]);

  const handleSwapAssets = useCallback(() => {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
    setQuote(null);
    setError(null);
    setStatus('idle');
  }, [fromAsset, toAsset]);

  // Get Quote based on active network
  const handleGetQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setStatus('quoting');
    setError(null);
    setQuote(null);

    try {
      let res: Response;

      if (activeNetwork === 'thorchain') {
        // THORChain cross-chain swap
        const params = new URLSearchParams({
          from_asset: fromAsset.symbol,
          to_asset: toAsset.symbol,
          amount: amount,
        });
        if (destinationAddress) params.set('destination', destinationAddress);
        if (isPremium) params.set('premium', 'true');

        res = await fetch(`/api/swap/?${params.toString()}`);

      } else if (activeNetwork === 'solana') {
        // Jupiter swap on Solana
        if (!fromAsset.mint || !toAsset.mint) {
          setError('Token mint addresses not configured');
          setStatus('error');
          return;
        }
        const amountInSmallest = Number(toSmallestUnit(amount, fromAsset.decimals || 9));
        const params = new URLSearchParams({
          inputMint: fromAsset.mint,
          outputMint: toAsset.mint,
          amount: amountInSmallest.toString(),
          slippageBps: Math.floor(slippage * 100).toString(),
        });
        if (isPremium) params.set('premium', 'true');

        res = await fetch(`/api/swap/solana/?${params.toString()}`);

      } else {
        // EVM swap via 1inch/Paraswap
        const nativeToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
        const fromAddr = fromAsset.address || nativeToken;
        const toAddr = toAsset.address || nativeToken;
        const amountInWei = toSmallestUnit(amount, fromAsset.decimals || 18);

        const params = new URLSearchParams({
          chainId: evmChainId.toString(),
          fromToken: fromAddr,
          toToken: toAddr,
          amount: amountInWei.toString(),
          slippage: slippage.toString(),
        });
        if (walletAddress) params.set('fromAddress', walletAddress);
        if (isPremium) params.set('premium', 'true');

        res = await fetch(`/api/swap/evm/?${params.toString()}`);
      }

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to get quote');
        setStatus('error');
        return;
      }

      // Normalize the response for display
      if (activeNetwork === 'solana' && data.quote) {
        // Convert Jupiter quote to display format
        const outAmount = parseInt(data.quote.outAmount || '0');
        const outDecimals = toAsset.decimals || 9;
        const outputHuman = outAmount / Math.pow(10, outDecimals);
        const outputUsd = outputHuman * (usdPrices[toAsset.symbol] || 0);
        const feeAmount = data.fee?.feeAmount ? parseInt(data.fee.feeAmount) / Math.pow(10, outDecimals) : 0;
        const priceImpact = parseFloat(data.quote.priceImpactPct || '0');

        const normalizedQuote: QuoteResponse = {
          success: true,
          provider: 'Jupiter',
          chain: 'Solana',
          quote: {
            expectedOutput: outputHuman.toFixed(outDecimals > 6 ? 6 : outDecimals),
            expectedOutputUsd: outputUsd,
            fees: {
              network: '~0.000005 SOL',
              networkUsd: 0.001,
              affiliate: feeAmount.toFixed(6),
              affiliateUsd: feeAmount * (usdPrices[toAsset.symbol] || 0),
              total: feeAmount.toFixed(6),
              totalUsd: feeAmount * (usdPrices[toAsset.symbol] || 0) + 0.001,
            },
            slippageBps: Math.floor(priceImpact * 100),
            estimatedTime: 5,
            route: data.quote.routePlan?.map((r: any) => r.swapInfo?.label).filter(Boolean).join(' -> ') || 'Jupiter',
            inboundAddress: '',
            memo: '',
            expiry: Math.floor(Date.now() / 1000) + 60,
          },
          fee: data.fee,
        };
        setQuote(normalizedQuote);
      } else if (activeNetwork === 'evm' && data.quote) {
        // Convert EVM quote to display format
        const outAmount = BigInt(data.quote.outputAmount || '0');
        const outDecimals = toAsset.decimals || 18;
        const outputHuman = Number(outAmount) / Math.pow(10, outDecimals);
        const outputUsd = outputHuman * (usdPrices[toAsset.symbol] || 0);
        const feeBps = data.fee?.feeBps || 0;
        const feeUsd = outputUsd * feeBps / 10000;

        const normalizedQuote: QuoteResponse = {
          success: true,
          bestProvider: data.bestProvider,
          chain: data.chain,
          quote: {
            expectedOutput: outputHuman.toFixed(Math.min(outDecimals, 8)),
            expectedOutputUsd: outputUsd,
            fees: {
              network: '~gas',
              networkUsd: 2,
              affiliate: `${(feeBps / 100).toFixed(1)}%`,
              affiliateUsd: feeUsd,
              total: `${(feeBps / 100).toFixed(1)}%`,
              totalUsd: feeUsd + 2,
            },
            slippageBps: Math.floor(slippage * 100),
            estimatedTime: evmChainId === 1 ? 180 : 15,
            route: `${fromAsset.symbol} -> ${data.bestProvider || '1inch'} -> ${toAsset.symbol}`,
            inboundAddress: '',
            memo: '',
            expiry: Math.floor(Date.now() / 1000) + 120,
          },
          fee: data.fee,
        };
        setQuote(normalizedQuote);
      } else {
        // THORChain quote is already in correct format
        setQuote(data);
      }

      setStatus('quoted');
    } catch (err) {
      setError('Network error. Please try again.');
      setStatus('error');
    }
  }, [amount, fromAsset, toAsset, destinationAddress, isPremium, activeNetwork, evmChainId, slippage, walletAddress, usdPrices]);

  const handleExecuteSwap = useCallback(async () => {
    if (activeNetwork === 'thorchain') {
      if (!quote?.quote?.inboundAddress) {
        setError('No valid quote to execute');
        return;
      }
      setStatus('confirming');
    } else if (activeNetwork === 'solana') {
      if (!solWallet.isConnected) {
        setError('Please connect your Phantom wallet first');
        return;
      }
      // For Solana, the user needs to sign the transaction via Phantom
      setStatus('confirming');
    } else if (activeNetwork === 'evm') {
      if (!ethWallet.isConnected) {
        setError('Please connect MetaMask first');
        return;
      }
      // For EVM, the user needs to sign via MetaMask
      setStatus('confirming');
    }
  }, [quote, activeNetwork, solWallet.isConnected, ethWallet.isConnected]);

  const copyToClipboard = useCallback(async (text: string, type: 'memo' | 'address') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'memo') {
        setCopiedMemo(true);
        setTimeout(() => setCopiedMemo(false), 2000);
      } else {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      }
    } catch {
      // Fallback
    }
  }, []);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const formatUsd = (value: number): string => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const selectFromAsset = (asset: TokenInfo) => {
    if (asset.symbol === toAsset.symbol) setToAsset(fromAsset);
    setFromAsset(asset);
    setShowFromDropdown(false);
    setQuote(null);
    setStatus('idle');
  };

  const selectToAsset = (asset: TokenInfo) => {
    if (asset.symbol === fromAsset.symbol) setFromAsset(toAsset);
    setToAsset(asset);
    setShowToDropdown(false);
    setQuote(null);
    setStatus('idle');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-5 h-5 text-white/70" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ArrowRightLeft className="w-6 h-6 text-[#F7931A]" />
                  <span className="text-white">CYPHER</span>
                  <span className="text-[#F7931A]">SWAP</span>
                </h1>
                <p className="text-xs text-white/50 mt-1">
                  Multi-chain DEX aggregator | THORChain + Jupiter + 1inch
                </p>
              </div>
            </div>
            {/* Wallet Status */}
            <div className="flex items-center gap-2">
              {activeNetwork !== 'thorchain' && (
                isWalletConnected ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-green-400 font-mono">
                      {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connected'}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectWallet}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[#F7931A]/50 rounded-lg text-[#F7931A] text-xs font-medium hover:bg-[#F7931A]/10 transition-colors"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Connect {networkConfig.walletLabel.split(' / ')[0]}
                  </button>
                )
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-400 font-medium">{networkConfig.name} Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Tabs defaultValue="swap" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="swap" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Swap
              </TabsTrigger>
              <TabsTrigger value="earn" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                <TrendingUp className="w-4 h-4 mr-2" />
                Earn
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                <History className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>
          </div>

          {/* === SWAP TAB === */}
          <TabsContent value="swap">
            <div className="max-w-2xl mx-auto">

              {/* Network Selector */}
              <div className="flex items-center gap-2 mb-6">
                {NETWORKS.map((net) => (
                  <button
                    key={net.id}
                    onClick={() => setActiveNetwork(net.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      activeNetwork === net.id
                        ? 'bg-white/10 border-[#F7931A]/50 text-white'
                        : 'bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/5 hover:text-white/70'
                    }`}
                  >
                    <span style={{ color: net.color }}>{net.icon}</span>
                    <span>{net.label}</span>
                    {activeNetwork === net.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F7931A]/20 text-[#F7931A] font-bold">
                        {net.feeLabel}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* EVM Chain Selector (only for EVM network) */}
              {activeNetwork === 'evm' && (
                <div className="mb-4 relative">
                  <button
                    onClick={() => setShowEvmChainDropdown(!showEvmChainDropdown)}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 hover:bg-white/10 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Network: {EVM_CHAINS.find(c => c.id === evmChainId)?.name || 'Ethereum'}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showEvmChainDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-[#111] border border-white/10 rounded-lg shadow-2xl z-50">
                      {EVM_CHAINS.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={() => { setEvmChainId(chain.id); setShowEvmChainDropdown(false); setQuote(null); setStatus('idle'); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${
                            chain.id === evmChainId ? 'bg-white/5' : ''
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chain.color }} />
                          <span className="text-sm text-white">{chain.name}</span>
                          {chain.id === evmChainId && <Check className="w-4 h-4 text-[#F7931A] ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Swap Card */}
              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
                {/* From Section */}
                <div className="p-6 border-b border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/40 uppercase tracking-wider font-medium">You Send</span>
                    <div className="flex items-center gap-2">
                      {inputUsd > 0 && <span className="text-xs text-white/40">{formatUsd(inputUsd)}</span>}
                      {/* Slippage Settings */}
                      <button
                        onClick={() => setShowSlippage(!showSlippage)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        title="Slippage settings"
                      >
                        <Settings className="w-3.5 h-3.5 text-white/40" />
                      </button>
                    </div>
                  </div>
                  {/* Slippage Dropdown */}
                  {showSlippage && (
                    <div className="mb-3 p-3 bg-white/[0.03] border border-white/10 rounded-lg">
                      <div className="text-xs text-white/50 mb-2">Slippage Tolerance</div>
                      <div className="flex items-center gap-2">
                        {[0.1, 0.5, 1.0, 3.0].map((val) => (
                          <button
                            key={val}
                            onClick={() => { setSlippage(val); setShowSlippage(false); }}
                            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                              slippage === val ? 'bg-[#F7931A]/20 text-[#F7931A] border border-[#F7931A]/30' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {val}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <button
                        onClick={() => { setShowFromDropdown(!showFromDropdown); setShowToDropdown(false); }}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                      >
                        <span className="text-lg" style={{ color: fromAsset.color }}>{fromAsset.icon}</span>
                        <span className="font-bold text-white">{fromAsset.symbol}</span>
                        <ChevronDown className="w-4 h-4 text-white/50" />
                      </button>
                      {showFromDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-[#111] border border-white/10 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto">
                          {tokens.map((asset) => (
                            <button
                              key={asset.symbol}
                              onClick={() => selectFromAsset(asset)}
                              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                                asset.symbol === fromAsset.symbol ? 'bg-white/5' : ''
                              }`}
                            >
                              <span className="text-lg" style={{ color: asset.color }}>{asset.icon}</span>
                              <div className="text-left">
                                <div className="text-sm font-medium text-white">{asset.symbol}</div>
                                <div className="text-xs text-white/40">{asset.name}</div>
                              </div>
                              <span className="ml-auto text-xs text-white/30">{asset.chain}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setQuote(null); setStatus('idle'); }}
                      placeholder="0.00"
                      className="flex-1 bg-transparent text-right text-2xl font-mono text-white placeholder-white/20 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {/* Swap Direction Button */}
                <div className="relative flex items-center justify-center -my-4 z-10">
                  <button
                    onClick={handleSwapAssets}
                    className="w-10 h-10 bg-[#F7931A] hover:bg-[#F7931A]/80 rounded-full flex items-center justify-center transition-all hover:rotate-180 duration-300 shadow-lg shadow-[#F7931A]/20"
                    aria-label="Swap direction"
                  >
                    <ArrowRightLeft className="w-5 h-5 text-black rotate-90" />
                  </button>
                </div>

                {/* To Section */}
                <div className="p-6 border-b border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/40 uppercase tracking-wider font-medium">You Receive</span>
                    {quote?.quote && (
                      <span className="text-xs text-white/40">{formatUsd(quote.quote.expectedOutputUsd)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <button
                        onClick={() => { setShowToDropdown(!showToDropdown); setShowFromDropdown(false); }}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                      >
                        <span className="text-lg" style={{ color: toAsset.color }}>{toAsset.icon}</span>
                        <span className="font-bold text-white">{toAsset.symbol}</span>
                        <ChevronDown className="w-4 h-4 text-white/50" />
                      </button>
                      {showToDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-[#111] border border-white/10 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto">
                          {tokens.map((asset) => (
                            <button
                              key={asset.symbol}
                              onClick={() => selectToAsset(asset)}
                              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                                asset.symbol === toAsset.symbol ? 'bg-white/5' : ''
                              }`}
                            >
                              <span className="text-lg" style={{ color: asset.color }}>{asset.icon}</span>
                              <div className="text-left">
                                <div className="text-sm font-medium text-white">{asset.symbol}</div>
                                <div className="text-xs text-white/40">{asset.name}</div>
                              </div>
                              <span className="ml-auto text-xs text-white/30">{asset.chain}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-right">
                      {status === 'quoting' ? (
                        <div className="flex items-center justify-end gap-2">
                          <RefreshCw className="w-5 h-5 text-[#F7931A] animate-spin" />
                          <span className="text-white/40 text-lg">Fetching quote...</span>
                        </div>
                      ) : quote?.quote ? (
                        <span className="text-2xl font-mono text-white">{quote.quote.expectedOutput}</span>
                      ) : (
                        <span className="text-2xl text-white/20 font-mono">0.00</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Destination Address (THORChain only) */}
                {activeNetwork === 'thorchain' && (
                  <div className="px-6 py-4 border-b border-white/5">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2 block">
                      Destination Address ({toAsset.name})
                    </label>
                    <input
                      type="text"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      placeholder={`Enter your ${toAsset.symbol} address`}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-white/20 outline-none focus:border-[#F7931A]/50 transition-colors"
                    />
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-400">{error}</span>
                  </div>
                )}

                {/* Quote Details */}
                {quote?.quote && status === 'quoted' && (
                  <div className="mx-6 mt-4 p-4 bg-white/[0.02] border border-white/10 rounded-lg space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50">Rate</span>
                      <span className="text-white font-mono">
                        1 {fromAsset.symbol} = {(parseFloat(quote.quote.expectedOutput) / parseFloat(amount || '1')).toFixed(6)} {toAsset.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Est. Time
                      </span>
                      <span className="text-white">{formatTime(quote.quote.estimatedTime)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50">Slippage</span>
                      <span className={`font-mono ${quote.quote.slippageBps > 100 ? 'text-orange-400' : 'text-white'}`}>
                        {(quote.quote.slippageBps / 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50">Route</span>
                      <span className="text-white/70 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-[#F7931A]" /> {quote.quote.route}
                      </span>
                    </div>
                    {quote.bestProvider && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50">Provider</span>
                        <span className="text-white/70 font-mono">{quote.bestProvider}</span>
                      </div>
                    )}

                    {/* Fee Breakdown */}
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <div className="text-xs text-white/40 uppercase tracking-wider font-medium">Fee Breakdown</div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50">Network Fee</span>
                        <span className="text-white font-mono">
                          {quote.quote.fees.network}
                          {quote.quote.fees.networkUsd > 0 && (
                            <span className="text-white/30 ml-1">({formatUsd(quote.quote.fees.networkUsd)})</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50 flex items-center gap-1.5">
                          CYPHER Fee ({networkConfig.feeLabel})
                          {isPremium && (
                            <span className="px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-[10px] text-green-400 font-medium">
                              YHP
                            </span>
                          )}
                        </span>
                        <span className="text-white font-mono">
                          {isPremium ? (
                            <span className="text-green-400">0% fees</span>
                          ) : (
                            <>
                              {quote.quote.fees.affiliate}
                              {quote.quote.fees.affiliateUsd > 0 && (
                                <span className="text-white/30 ml-1">({formatUsd(quote.quote.fees.affiliateUsd)})</span>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                      {!isPremium && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#F7931A]/70">
                          <Zap className="w-3 h-3" />
                          <span>Hold YHP for 0% platform fees</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm font-medium pt-1 border-t border-white/5">
                        <span className="text-white/70">Total Fees</span>
                        <span className="text-[#F7931A] font-mono">
                          {quote.quote.fees.total}
                          {quote.quote.fees.totalUsd > 0 && (
                            <span className="text-white/30 ml-1">({formatUsd(quote.quote.fees.totalUsd)})</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Warning */}
                    {quote.quote.warningMessage && (
                      <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-yellow-400">{quote.quote.warningMessage}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* THORChain Execution Details */}
                {status === 'confirming' && activeNetwork === 'thorchain' && quote?.quote && (
                  <div className="mx-6 mt-4 p-4 bg-[#F7931A]/5 border border-[#F7931A]/20 rounded-lg space-y-4">
                    <div className="text-sm font-medium text-[#F7931A] flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Send Transaction Details
                    </div>
                    <p className="text-xs text-white/50">
                      Send exactly <span className="text-white font-mono">{amount} {fromAsset.symbol}</span> to the address below with the memo.
                    </p>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Inbound Address</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-black/50 px-3 py-2 rounded text-xs font-mono text-white/80 break-all border border-white/5">
                          {quote.quote.inboundAddress}
                        </code>
                        <button onClick={() => copyToClipboard(quote.quote!.inboundAddress, 'address')} className="p-2 bg-white/5 hover:bg-white/10 rounded transition-colors">
                          {copiedAddress ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/50" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Memo (Required)</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-black/50 px-3 py-2 rounded text-xs font-mono text-white/80 break-all border border-white/5">
                          {quote.quote.memo}
                        </code>
                        <button onClick={() => copyToClipboard(quote.quote!.memo, 'memo')} className="p-2 bg-white/5 hover:bg-white/10 rounded transition-colors">
                          {copiedMemo ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/50" />}
                        </button>
                      </div>
                    </div>
                    <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-xs text-red-400 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        Verify the inbound address on THORChain explorer before sending.
                      </p>
                    </div>
                  </div>
                )}

                {/* Solana/EVM Execution Details */}
                {status === 'confirming' && activeNetwork !== 'thorchain' && quote?.quote && (
                  <div className="mx-6 mt-4 p-4 bg-[#F7931A]/5 border border-[#F7931A]/20 rounded-lg space-y-4">
                    <div className="text-sm font-medium text-[#F7931A] flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Confirm in {activeNetwork === 'solana' ? 'Phantom' : 'MetaMask'}
                    </div>
                    <div className="space-y-2 text-xs text-white/60">
                      <p>Swap <span className="text-white font-mono">{amount} {fromAsset.symbol}</span> for <span className="text-white font-mono">~{quote.quote.expectedOutput} {toAsset.symbol}</span></p>
                      <p>Fee: {isPremium ? '0% (YHP Premium)' : networkConfig.feeLabel}</p>
                      <p>Fee collection: Native (deducted by {activeNetwork === 'solana' ? 'Jupiter' : quote.bestProvider || '1inch'})</p>
                      <p>Fee wallet: {activeNetwork === 'solana' ? '4boX...CwRH' : '0xAE36...ddd3'}</p>
                    </div>
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-xs text-blue-400 flex items-start gap-1.5">
                        <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        Your wallet will prompt you to sign the transaction. Review the details carefully.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="p-6">
                  {status === 'idle' || status === 'error' ? (
                    activeNetwork !== 'thorchain' && !isWalletConnected ? (
                      <button
                        onClick={handleConnectWallet}
                        className="w-full py-4 bg-[#F7931A] hover:bg-[#F7931A]/90 text-black font-bold rounded-lg transition-all text-lg flex items-center justify-center gap-2"
                      >
                        <Wallet className="w-5 h-5" />
                        Connect {networkConfig.walletLabel.split(' / ')[0]}
                      </button>
                    ) : (
                      <button
                        onClick={handleGetQuote}
                        disabled={!amount || parseFloat(amount) <= 0}
                        className="w-full py-4 bg-[#F7931A] hover:bg-[#F7931A]/90 disabled:bg-white/5 disabled:text-white/20 text-black font-bold rounded-lg transition-all text-lg disabled:cursor-not-allowed"
                      >
                        Get Quote
                      </button>
                    )
                  ) : status === 'quoting' ? (
                    <button disabled className="w-full py-4 bg-white/5 text-white/50 font-bold rounded-lg flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Fetching Best Route...
                    </button>
                  ) : status === 'quoted' ? (
                    <div className="space-y-3">
                      <button
                        onClick={handleExecuteSwap}
                        disabled={activeNetwork === 'thorchain' && !destinationAddress}
                        className="w-full py-4 bg-[#F7931A] hover:bg-[#F7931A]/90 disabled:bg-white/5 disabled:text-white/20 text-black font-bold rounded-lg transition-all text-lg disabled:cursor-not-allowed"
                      >
                        {activeNetwork === 'thorchain' && !destinationAddress
                          ? 'Enter Destination Address'
                          : 'Execute Swap'}
                      </button>
                      <button
                        onClick={handleGetQuote}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/70 font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh Quote
                      </button>
                    </div>
                  ) : status === 'confirming' ? (
                    <div className="space-y-3">
                      {activeNetwork === 'thorchain' && (
                        <a
                          href="https://thorchain.net"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/70 font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Verify on THORChain Explorer
                        </a>
                      )}
                      <button
                        onClick={() => setStatus('quoted')}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/50 font-medium rounded-lg transition-colors text-sm"
                      >
                        Back to Quote
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Fee Collection Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className={`bg-[#0a0a0a] border rounded-lg p-4 ${activeNetwork === 'thorchain' ? 'border-[#33FF99]/30' : 'border-white/10'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-[#33FF99]" />
                    <span className="text-sm font-medium text-white">THORChain</span>
                  </div>
                  <p className="text-xs text-white/40">
                    Cross-chain swaps. No wrapped tokens. 0.5% affiliate fee.
                  </p>
                </div>
                <div className={`bg-[#0a0a0a] border rounded-lg p-4 ${activeNetwork === 'evm' ? 'border-[#627EEA]/30' : 'border-white/10'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-[#627EEA]" />
                    <span className="text-sm font-medium text-white">EVM Multi-DEX</span>
                  </div>
                  <p className="text-xs text-white/40">
                    1inch + Paraswap. ETH, ARB, BASE, OP, MATIC, BSC.
                  </p>
                </div>
                <div className={`bg-[#0a0a0a] border rounded-lg p-4 ${activeNetwork === 'solana' ? 'border-[#9945FF]/30' : 'border-white/10'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-4 h-4 text-[#9945FF]" />
                    <span className="text-sm font-medium text-white">Solana Jupiter</span>
                  </div>
                  <p className="text-xs text-white/40">
                    Jupiter aggregator. SOL, USDC, BONK, JUP, 1000+ tokens.
                  </p>
                </div>
              </div>

              {/* Supported Assets Grid */}
              <div className="mt-8 bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider mb-4">
                  {networkConfig.name} Tokens
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {tokens.map((asset) => (
                    <div
                      key={asset.symbol}
                      className="flex flex-col items-center gap-1.5 p-3 bg-white/[0.02] border border-white/5 rounded-lg hover:border-white/10 transition-colors cursor-pointer"
                      onClick={() => selectFromAsset(asset)}
                    >
                      <span className="text-xl" style={{ color: asset.color }}>{asset.icon}</span>
                      <span className="text-xs font-bold text-white">{asset.symbol}</span>
                      <span className="text-[10px] text-white/30">{asset.chain}</span>
                      {usdPrices[asset.symbol] !== undefined && (
                        <span className="text-[10px] text-white/40 font-mono">
                          {usdPrices[asset.symbol] < 0.01 ? `$${usdPrices[asset.symbol].toFixed(6)}` : formatUsd(usdPrices[asset.symbol])}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* === EARN TAB === */}
          <TabsContent value="earn">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-5 h-5 text-[#F7931A]" />
                    <span className="text-xs text-white/40 uppercase tracking-wider font-mono">Total Deposited</span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-white">$0.00</p>
                  <p className="text-xs text-white/30 mt-1">Connect wallet to view</p>
                </div>
                <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="w-5 h-5 text-green-400" />
                    <span className="text-xs text-white/40 uppercase tracking-wider font-mono">Total Earned</span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-green-400">$0.00</p>
                  <p className="text-xs text-white/30 mt-1">Lifetime earnings</p>
                </div>
                <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-5 h-5 text-blue-400" />
                    <span className="text-xs text-white/40 uppercase tracking-wider font-mono">Active Positions</span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-white">0</p>
                  <p className="text-xs text-white/30 mt-1">Across all pools</p>
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                  <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono">Available Yield Opportunities</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {EARN_POOLS.map((pool) => (
                    <div key={pool.asset} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
                          <span className="text-lg" style={{ color: pool.color }}>{pool.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white font-mono">{pool.name}</p>
                          <p className="text-xs text-white/40">Min: {pool.minDeposit}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-green-400">{pool.apy} APY</p>
                          <p className="text-xs text-white/40">TVL: {pool.tvl}</p>
                        </div>
                        <button className="px-4 py-2 bg-[#F7931A]/10 border border-[#F7931A]/30 text-[#F7931A] text-xs font-mono font-medium rounded-lg hover:bg-[#F7931A]/20 transition-colors">
                          Deposit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-[#F7931A]/20 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-[#F7931A] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white mb-1">THORChain Savers Vaults</p>
                    <p className="text-xs text-white/50">
                      Earn yield on native assets. Single-sided deposits with no impermanent loss.
                      Yields from swap fees and block rewards. APY is variable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* === HISTORY TAB === */}
          <TabsContent value="history">
            <div className="space-y-6">
              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono">Transaction History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wider font-mono font-medium">Date</th>
                        <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wider font-mono font-medium">Pair</th>
                        <th className="px-6 py-3 text-right text-xs text-white/40 uppercase tracking-wider font-mono font-medium">From</th>
                        <th className="px-6 py-3 text-right text-xs text-white/40 uppercase tracking-wider font-mono font-medium">To</th>
                        <th className="px-6 py-3 text-center text-xs text-white/40 uppercase tracking-wider font-mono font-medium">Status</th>
                        <th className="px-6 py-3 text-right text-xs text-white/40 uppercase tracking-wider font-mono font-medium">TX</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {swapHistory.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 text-xs text-white/50 font-mono">{tx.date}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-mono font-medium text-white">{tx.fromAsset}</span>
                            <span className="text-xs text-white/30 mx-1">&rarr;</span>
                            <span className="text-xs font-mono font-medium text-white">{tx.toAsset}</span>
                          </td>
                          <td className="px-6 py-4 text-right text-xs font-mono text-white/70">{tx.fromAmount}</td>
                          <td className="px-6 py-4 text-right text-xs font-mono text-white/70">{tx.toAmount}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-mono font-medium ${
                              tx.status === 'completed'
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'completed' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xs text-[#F7931A] font-mono flex items-center gap-1 justify-end">
                              {tx.txHash !== '-' ? `${tx.txHash.slice(0, 8)}...` : '-'}
                              {tx.txHash !== '-' && <ExternalLink className="w-3 h-3" />}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {swapHistory.length === 0 && (
                  <div className="px-6 py-16 text-center">
                    <History className="w-8 h-8 text-white/20 mx-auto mb-3" />
                    <p className="text-sm text-white/40 font-mono">No transactions yet</p>
                    <p className="text-xs text-white/20 mt-1">Your swap history will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
