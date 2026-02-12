'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePremium } from '@/contexts/PremiumContext';
import {
  ArrowRightLeft,
  ArrowLeft,
  Home,
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
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Supported assets with metadata
const SUPPORTED_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '\u20bf', color: '#F7931A', chain: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', icon: '\u039e', color: '#627EEA', chain: 'Ethereum' },
  { symbol: 'USDT', name: 'Tether', icon: '\u20ae', color: '#26A17B', chain: 'Ethereum' },
  { symbol: 'USDC', name: 'USD Coin', icon: '$', color: '#2775CA', chain: 'Ethereum' },
  { symbol: 'AVAX', name: 'Avalanche', icon: 'A', color: '#E84142', chain: 'Avalanche' },
  { symbol: 'BNB', name: 'BNB', icon: 'B', color: '#F3BA2F', chain: 'BSC' },
  { symbol: 'ATOM', name: 'Cosmos', icon: '\u269b', color: '#2E3148', chain: 'Cosmos' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: '\u00d0', color: '#C2A633', chain: 'Dogecoin' },
  { symbol: 'LTC', name: 'Litecoin', icon: '\u0141', color: '#BFBBBB', chain: 'Litecoin' },
];

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
  input?: {
    asset: string;
    amount: string;
    amountUsd: number;
    chain: string;
  };
  output?: {
    asset: string;
    chain: string;
  };
  quote?: SwapQuote;
  affiliate?: {
    code: string;
    feeBps: number;
    feePercent: string;
    isPremium?: boolean;
  };
}

type SwapStatus = 'idle' | 'quoting' | 'quoted' | 'confirming' | 'broadcasting' | 'pending' | 'success' | 'error';

// Mock history data
const MOCK_HISTORY = [
  { id: 1, date: '2026-02-10 14:32', fromAsset: 'BTC', toAsset: 'ETH', fromAmount: '0.5', toAmount: '8.124', status: 'completed', txHash: '0xabc...def1' },
  { id: 2, date: '2026-02-09 09:15', fromAsset: 'ETH', toAsset: 'USDC', fromAmount: '2.0', toAmount: '6,412.50', status: 'completed', txHash: '0xabc...def2' },
  { id: 3, date: '2026-02-08 22:48', fromAsset: 'BTC', toAsset: 'AVAX', fromAmount: '0.1', toAmount: '277.14', status: 'completed', txHash: '0xabc...def3' },
  { id: 4, date: '2026-02-07 16:03', fromAsset: 'DOGE', toAsset: 'BTC', fromAmount: '10000', toAmount: '0.033', status: 'completed', txHash: '0xabc...def4' },
  { id: 5, date: '2026-02-06 11:20', fromAsset: 'BNB', toAsset: 'ETH', fromAmount: '5.0', toAmount: '0.937', status: 'pending', txHash: '0xabc...def5' },
];

// Earn pools mock data
const EARN_POOLS = [
  { asset: 'BTC', name: 'Bitcoin Staking', apy: '4.2%', tvl: '$1.2B', minDeposit: '0.001 BTC', icon: '\u20bf', color: '#F7931A' },
  { asset: 'ETH', name: 'Ethereum Staking', apy: '3.8%', tvl: '$890M', minDeposit: '0.01 ETH', icon: '\u039e', color: '#627EEA' },
  { asset: 'USDC', name: 'USDC Lending', apy: '8.5%', tvl: '$450M', minDeposit: '10 USDC', icon: '$', color: '#2775CA' },
  { asset: 'BTC/ETH', name: 'BTC/ETH Liquidity', apy: '12.3%', tvl: '$320M', minDeposit: '0.001 BTC', icon: '\u20bf', color: '#F7931A' },
  { asset: 'RUNE', name: 'THORChain LP', apy: '15.7%', tvl: '$210M', minDeposit: '10 RUNE', icon: '\u26a1', color: '#33FF99' },
];

export default function SwapPage() {
  const { isPremium } = usePremium();
  const [fromAsset, setFromAsset] = useState(SUPPORTED_ASSETS[0]); // BTC
  const [toAsset, setToAsset] = useState(SUPPORTED_ASSETS[1]); // ETH
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [usdPrices, setUsdPrices] = useState<Record<string, number>>({});

  // Fetch USD prices on load
  useEffect(() => {
    async function fetchPrices() {
      try {
        const ids = 'bitcoin,ethereum,tether,usd-coin,avalanche-2,binancecoin,cosmos,dogecoin,litecoin';
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
        );
        if (res.ok) {
          const data = await res.json();
          setUsdPrices({
            'BTC': data.bitcoin?.usd || 97000,
            'ETH': data.ethereum?.usd || 3200,
            'USDT': data.tether?.usd || 1,
            'USDC': data['usd-coin']?.usd || 1,
            'AVAX': data['avalanche-2']?.usd || 35,
            'BNB': data.binancecoin?.usd || 600,
            'ATOM': data.cosmos?.usd || 9,
            'DOGE': data.dogecoin?.usd || 0.32,
            'LTC': data.litecoin?.usd || 100,
          });
        }
      } catch {
        // Use fallbacks
        setUsdPrices({
          'BTC': 97000, 'ETH': 3200, 'USDT': 1, 'USDC': 1,
          'AVAX': 35, 'BNB': 600, 'ATOM': 9, 'DOGE': 0.32, 'LTC': 100,
        });
      }
    }
    fetchPrices();
  }, []);

  const inputUsd = amount ? parseFloat(amount) * (usdPrices[fromAsset.symbol] || 0) : 0;

  const handleSwapAssets = useCallback(() => {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
    setQuote(null);
    setError(null);
    setStatus('idle');
  }, [fromAsset, toAsset]);

  const handleGetQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setStatus('quoting');
    setError(null);
    setQuote(null);

    try {
      const params = new URLSearchParams({
        from_asset: fromAsset.symbol,
        to_asset: toAsset.symbol,
        amount: amount,
      });

      if (destinationAddress) {
        params.set('destination', destinationAddress);
      }

      if (isPremium) {
        params.set('premium', 'true');
      }

      const res = await fetch(`/api/swap?${params.toString()}`);
      const data: QuoteResponse = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to get quote');
        setStatus('error');
        return;
      }

      setQuote(data);
      setStatus('quoted');
    } catch (err) {
      setError('Network error. Please try again.');
      setStatus('error');
    }
  }, [amount, fromAsset, toAsset, destinationAddress, isPremium]);

  const handleExecuteSwap = useCallback(() => {
    if (!quote?.quote?.inboundAddress) {
      setError('No valid quote to execute');
      return;
    }
    setStatus('confirming');
  }, [quote]);

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

  const selectFromAsset = (asset: typeof SUPPORTED_ASSETS[0]) => {
    if (asset.symbol === toAsset.symbol) {
      setToAsset(fromAsset);
    }
    setFromAsset(asset);
    setShowFromDropdown(false);
    setQuote(null);
    setStatus('idle');
  };

  const selectToAsset = (asset: typeof SUPPORTED_ASSETS[0]) => {
    if (asset.symbol === fromAsset.symbol) {
      setFromAsset(toAsset);
    }
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
                  <span className="text-white">CROSS-CHAIN</span>
                  <span className="text-[#F7931A]">SWAP</span>
                </h1>
                <p className="text-xs text-white/50 mt-1">
                  Powered by THORChain | Cross-chain swaps with no wrapped tokens
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-400 font-medium">THORChain Live</span>
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
              {/* Swap Card */}
              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
                {/* From Section */}
                <div className="p-6 border-b border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/40 uppercase tracking-wider font-medium">You Send</span>
                    {inputUsd > 0 && (
                      <span className="text-xs text-white/40">{formatUsd(inputUsd)}</span>
                    )}
                  </div>
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
                          {SUPPORTED_ASSETS.map((asset) => (
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
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setQuote(null);
                        setStatus('idle');
                      }}
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
                          {SUPPORTED_ASSETS.map((asset) => (
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

                {/* Destination Address */}
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

                    {/* Fee Breakdown */}
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <div className="text-xs text-white/40 uppercase tracking-wider font-medium">Fee Breakdown</div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50">Network Fee</span>
                        <span className="text-white font-mono">
                          {quote.quote.fees.network} {toAsset.symbol}
                          <span className="text-white/30 ml-1">({formatUsd(quote.quote.fees.networkUsd)})</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50 flex items-center gap-1.5">
                          Affiliate Fee ({quote.affiliate?.feePercent || '0.5%'})
                          {isPremium && (
                            <span className="px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-[10px] text-green-400 font-medium">
                              YHP Member
                            </span>
                          )}
                        </span>
                        <span className="text-white font-mono">
                          {isPremium ? (
                            <span className="text-green-400">0% fees</span>
                          ) : (
                            <>
                              {quote.quote.fees.affiliate} {toAsset.symbol}
                              <span className="text-white/30 ml-1">({formatUsd(quote.quote.fees.affiliateUsd)})</span>
                            </>
                          )}
                        </span>
                      </div>
                      {!isPremium && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#F7931A]/70">
                          <Zap className="w-3 h-3" />
                          <span>Get YHP for 0% affiliate fees</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm font-medium pt-1 border-t border-white/5">
                        <span className="text-white/70">Total Fees</span>
                        <span className="text-[#F7931A] font-mono">
                          {quote.quote.fees.total} {toAsset.symbol}
                          <span className="text-white/30 ml-1">({formatUsd(quote.quote.fees.totalUsd)})</span>
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

                {/* Execution Details (after confirming) */}
                {status === 'confirming' && quote?.quote && (
                  <div className="mx-6 mt-4 p-4 bg-[#F7931A]/5 border border-[#F7931A]/20 rounded-lg space-y-4">
                    <div className="text-sm font-medium text-[#F7931A] flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Send Transaction Details
                    </div>
                    <p className="text-xs text-white/50">
                      Send exactly <span className="text-white font-mono">{amount} {fromAsset.symbol}</span> to the address below with the memo to execute the swap.
                    </p>

                    {/* Inbound Address */}
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Inbound Address (Send {fromAsset.symbol} here)</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-black/50 px-3 py-2 rounded text-xs font-mono text-white/80 break-all border border-white/5">
                          {quote.quote.inboundAddress}
                        </code>
                        <button
                          onClick={() => copyToClipboard(quote.quote.inboundAddress, 'address')}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded transition-colors"
                          title="Copy address"
                        >
                          {copiedAddress ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/50" />}
                        </button>
                      </div>
                    </div>

                    {/* Memo */}
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Transaction Memo (Required)</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-black/50 px-3 py-2 rounded text-xs font-mono text-white/80 break-all border border-white/5">
                          {quote.quote.memo}
                        </code>
                        <button
                          onClick={() => copyToClipboard(quote.quote.memo, 'memo')}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded transition-colors"
                          title="Copy memo"
                        >
                          {copiedMemo ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/50" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-xs text-red-400 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        Always verify the inbound address on THORChain explorer before sending. Never send funds without the correct memo.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="p-6">
                  {status === 'idle' || status === 'error' ? (
                    <button
                      onClick={handleGetQuote}
                      disabled={!amount || parseFloat(amount) <= 0}
                      className="w-full py-4 bg-[#F7931A] hover:bg-[#F7931A]/90 disabled:bg-white/5 disabled:text-white/20 text-black font-bold rounded-lg transition-all text-lg disabled:cursor-not-allowed"
                    >
                      Get Quote
                    </button>
                  ) : status === 'quoting' ? (
                    <button disabled className="w-full py-4 bg-white/5 text-white/50 font-bold rounded-lg flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Fetching Best Route...
                    </button>
                  ) : status === 'quoted' ? (
                    <div className="space-y-3">
                      <button
                        onClick={handleExecuteSwap}
                        disabled={!destinationAddress}
                        className="w-full py-4 bg-[#F7931A] hover:bg-[#F7931A]/90 disabled:bg-white/5 disabled:text-white/20 text-black font-bold rounded-lg transition-all text-lg disabled:cursor-not-allowed"
                      >
                        {destinationAddress ? 'Execute Swap' : 'Enter Destination Address'}
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
                      <a
                        href="https://thorchain.net"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/70 font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Verify on THORChain Explorer
                      </a>
                      <button
                        onClick={() => { setStatus('quoted'); }}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/50 font-medium rounded-lg transition-colors text-sm"
                      >
                        Back to Quote
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-[#F7931A]" />
                    <span className="text-sm font-medium text-white">Native Assets</span>
                  </div>
                  <p className="text-xs text-white/40">
                    THORChain swaps use native assets only. No wrapped tokens, no bridges, no custodial risk.
                  </p>
                </div>
                <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-[#F7931A]" />
                    <span className="text-sm font-medium text-white">Affiliate Revenue</span>
                  </div>
                  <p className="text-xs text-white/40">
                    A 0.5% affiliate fee supports CYPHER development. This is transparent and built into the quote.
                  </p>
                </div>
                <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRightLeft className="w-4 h-4 text-[#F7931A]" />
                    <span className="text-sm font-medium text-white">Cross-Chain</span>
                  </div>
                  <p className="text-xs text-white/40">
                    Swap between 9 supported chains: BTC, ETH, AVAX, BNB, ATOM, DOGE, LTC, and stablecoins.
                  </p>
                </div>
              </div>

              {/* Supported Assets Grid */}
              <div className="mt-8 bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider mb-4">Supported Assets</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {SUPPORTED_ASSETS.map((asset) => (
                    <div
                      key={asset.symbol}
                      className="flex flex-col items-center gap-1.5 p-3 bg-white/[0.02] border border-white/5 rounded-lg hover:border-white/10 transition-colors"
                    >
                      <span className="text-xl" style={{ color: asset.color }}>{asset.icon}</span>
                      <span className="text-xs font-bold text-white">{asset.symbol}</span>
                      <span className="text-[10px] text-white/30">{asset.chain}</span>
                      {usdPrices[asset.symbol] && (
                        <span className="text-[10px] text-white/40 font-mono">
                          {formatUsd(usdPrices[asset.symbol])}
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
              {/* Earn Summary */}
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

              {/* Earn Pools */}
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

              {/* Info */}
              <div className="bg-[#0a0a0a] border border-[#F7931A]/20 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-[#F7931A] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white mb-1">THORChain Savers Vaults</p>
                    <p className="text-xs text-white/50">
                      Earn yield on native assets through THORChain Savers Vaults. Single-sided deposits with no impermanent loss.
                      Yields are generated from swap fees and block rewards. APY rates are variable and depend on pool utilization.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* === HISTORY TAB === */}
          <TabsContent value="history">
            <div className="space-y-6">
              {/* History Table */}
              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono">Transaction History</h3>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-white/5 border border-white/10 text-xs text-white/50 font-mono rounded-lg hover:bg-white/10 transition-colors">
                      All
                    </button>
                    <button className="px-3 py-1.5 bg-white/5 border border-white/10 text-xs text-white/50 font-mono rounded-lg hover:bg-white/10 transition-colors">
                      Completed
                    </button>
                    <button className="px-3 py-1.5 bg-white/5 border border-white/10 text-xs text-white/50 font-mono rounded-lg hover:bg-white/10 transition-colors">
                      Pending
                    </button>
                  </div>
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
                      {MOCK_HISTORY.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 text-xs text-white/50 font-mono">{tx.date}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-mono font-medium text-white">{tx.fromAsset}</span>
                            <span className="text-xs text-white/30 mx-1">&rarr;</span>
                            <span className="text-xs font-mono font-medium text-white">{tx.toAsset}</span>
                          </td>
                          <td className="px-6 py-4 text-right text-xs font-mono text-white/70">{tx.fromAmount} {tx.fromAsset}</td>
                          <td className="px-6 py-4 text-right text-xs font-mono text-white/70">{tx.toAmount} {tx.toAsset}</td>
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
                            <button className="text-xs text-[#F7931A] hover:text-[#F7931A]/70 font-mono transition-colors flex items-center gap-1 ml-auto">
                              {tx.txHash}
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {MOCK_HISTORY.length === 0 && (
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
