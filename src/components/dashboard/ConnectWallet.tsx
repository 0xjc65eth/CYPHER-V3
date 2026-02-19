'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, Shield, ExternalLink, AlertCircle, Check, Loader2, Crown } from 'lucide-react';
import { useLaserEyes } from '@/providers/SimpleLaserEyesProvider';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useYHPVerification } from '@/hooks/useYHPVerification';
import { usePremium } from '@/contexts/PremiumContext';
import { getWalletAccessTier, hasPremiumAccess, type AccessTier } from '@/config/vip-wallets';

// Bitcoin wallet options
const BTC_WALLETS = [
  {
    id: 'unisat' as const,
    name: 'UniSat',
    description: 'The most popular Bitcoin wallet for DeFi',
    icon: '🟡',
    downloadUrl: 'https://unisat.io/',
    features: ['Bitcoin & Ordinals', 'DeFi Ready', 'Mobile Support'],
    recommended: true,
  },
  {
    id: 'xverse' as const,
    name: 'Xverse',
    description: 'Advanced Bitcoin wallet with stacking',
    icon: '🔮',
    downloadUrl: 'https://www.xverse.app/',
    features: ['Bitcoin & STX', 'NFT Support', 'Stacking'],
    recommended: false,
  },
  {
    id: 'oyl' as const,
    name: 'OYL',
    description: 'Professional trading wallet',
    icon: '⚡',
    downloadUrl: 'https://oyl.io/',
    features: ['Professional Tools', 'Advanced Trading', 'Portfolio Analytics'],
    recommended: false,
  },
  {
    id: 'magic_eden' as const,
    name: 'Magic Eden',
    description: 'NFT marketplace wallet',
    icon: '🎨',
    downloadUrl: 'https://magiceden.io/wallet',
    features: ['NFT Trading', 'Marketplace Integration', 'Creator Tools'],
    recommended: false,
  },
] as const;

// ── Access Tier Badge ──────────────────────────────────────────────
function AccessTierBadge({ tier }: { tier: AccessTier }) {
  if (tier === 'free') return null;
  const styles: Record<string, string> = {
    premium: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    vip: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    super_admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const labels: Record<string, string> = {
    premium: 'YHP Premium',
    vip: 'VIP Access',
    super_admin: 'Super Admin',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[tier]}`}>
      <Crown size={12} />
      {labels[tier]}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────
const ConnectWallet: React.FC = () => {
  // Bitcoin wallet (LaserEyes)
  const { connected: btcConnected, address: btcAddress, connect: btcConnect, disconnect: btcDisconnect } = useLaserEyes();

  // EVM wallet (Wagmi)
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { connect: evmConnect, isPending: evmConnecting } = useConnect();
  const { disconnect: evmDisconnect } = useDisconnect();

  // YHP verification (auto-runs when evmAddress changes)
  const { isHolder: isYHPHolder, loading: yhpLoading } = useYHPVerification(evmAddress ?? null);

  // Premium context
  const { isPremium, accessTier, setAccessTier, setIsPremium, setPremiumCollection, setIsVerifying } = usePremium();

  const [btcConnecting, setBtcConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── BTC VIP check on connection ──────────────────────────
  useEffect(() => {
    if (btcConnected && btcAddress) {
      const tier = getWalletAccessTier(btcAddress);
      if (hasPremiumAccess(tier)) {
        setAccessTier(tier);
        setIsPremium(true);
        setPremiumCollection('VIP WALLET');
      }
    }
  }, [btcConnected, btcAddress, setAccessTier, setIsPremium, setPremiumCollection]);

  // ── YHP verification status sync ─────────────────────────
  useEffect(() => {
    setIsVerifying(yhpLoading);
  }, [yhpLoading, setIsVerifying]);

  useEffect(() => {
    if (isYHPHolder && evmAddress) {
      setIsPremium(true);
      setPremiumCollection('YIELD HACKER PASS');
      if (accessTier === 'free') setAccessTier('premium');
    }
  }, [isYHPHolder, evmAddress, setIsPremium, setPremiumCollection, accessTier, setAccessTier]);

  // Effective tier (highest of BTC and ETH)
  const btcTier = getWalletAccessTier(btcConnected ? (btcAddress ?? null) : null);
  const effectiveTier: AccessTier = (() => {
    if (btcTier === 'super_admin' || accessTier === 'super_admin') return 'super_admin';
    if (btcTier === 'vip' || accessTier === 'vip') return 'vip';
    if (isYHPHolder || accessTier === 'premium') return 'premium';
    return 'free';
  })();

  // ── Handlers ─────────────────────────────────────────────
  const handleBtcConnect = async (providerId: string) => {
    setBtcConnecting(true);
    setError(null);
    try {
      await btcConnect(providerId as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Bitcoin wallet');
    } finally {
      setBtcConnecting(false);
    }
  };

  const handleEvmConnect = () => {
    setError(null);
    try {
      evmConnect({ connector: injected() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect EVM wallet');
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // ── Connected State ──────────────────────────────────────
  if (btcConnected || evmConnected) {
    return (
      <div className="space-y-4">
        {/* Access Tier Banner */}
        {hasPremiumAccess(effectiveTier) && (
          <div className={`p-3 rounded-lg border ${
            effectiveTier === 'super_admin'
              ? 'bg-red-900/20 border-red-500/30'
              : effectiveTier === 'vip'
                ? 'bg-orange-900/20 border-orange-500/30'
                : 'bg-purple-900/20 border-purple-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown size={16} className={
                  effectiveTier === 'super_admin' ? 'text-red-400' :
                  effectiveTier === 'vip' ? 'text-orange-400' : 'text-purple-400'
                } />
                <span className="text-sm font-medium text-white">
                  {effectiveTier === 'super_admin' ? 'Super Admin Access' :
                   effectiveTier === 'vip' ? 'VIP Full Access' : 'Premium Access (YHP)'}
                </span>
              </div>
              <AccessTierBadge tier={effectiveTier} />
            </div>
            <p className="text-xs text-gray-400 mt-1">0% fees on all trades</p>
          </div>
        )}

        {/* BTC Wallet */}
        {btcConnected && btcAddress && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-orange-500/20 rounded-full">
                  <span className="text-lg">₿</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white">Bitcoin Wallet</h4>
                    <AccessTierBadge tier={btcTier} />
                  </div>
                  <p className="text-xs text-gray-400 font-mono">{formatAddress(btcAddress)}</p>
                </div>
              </div>
              <button
                onClick={() => btcDisconnect()}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-xs"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* EVM Wallet */}
        {evmConnected && evmAddress && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-full">
                  <span className="text-lg">Ξ</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white">Ethereum Wallet</h4>
                    {yhpLoading && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" /> Verifying YHP...
                      </span>
                    )}
                    {!yhpLoading && isYHPHolder && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border bg-purple-500/20 text-purple-400 border-purple-500/30">
                        <Check size={10} /> YHP Holder
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-mono">{formatAddress(evmAddress)}</p>
                </div>
              </div>
              <button
                onClick={() => evmDisconnect()}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-xs"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Connect additional wallet */}
        {!evmConnected && (
          <button
            onClick={handleEvmConnect}
            disabled={evmConnecting}
            className="w-full py-2 px-4 bg-gray-800 border border-gray-700 hover:border-blue-500/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            {evmConnecting ? <Loader2 size={14} className="animate-spin" /> : <span>Ξ</span>}
            Connect Ethereum Wallet (for YHP verification)
          </button>
        )}
        {!btcConnected && (
          <button
            onClick={() => handleBtcConnect('unisat')}
            disabled={btcConnecting}
            className="w-full py-2 px-4 bg-gray-800 border border-gray-700 hover:border-orange-500/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            {btcConnecting ? <Loader2 size={14} className="animate-spin" /> : <span>₿</span>}
            Connect Bitcoin Wallet
          </button>
        )}
      </div>
    );
  }

  // ── Wallet Selection ─────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full border border-gray-700 mx-auto">
          <Wallet className="text-orange-500" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Connect a Bitcoin or Ethereum wallet to access trading and premium features
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="text-red-400 flex-shrink-0" size={16} />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* ── Bitcoin Wallets Section ── */}
      <div>
        <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>₿</span> Bitcoin Wallets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BTC_WALLETS.map((wallet) => (
            <div
              key={wallet.id}
              className={`relative p-5 bg-gray-800 rounded-xl border transition-all duration-300 hover:bg-gray-750 hover:border-orange-500/50 ${
                wallet.recommended ? 'border-orange-500/30 bg-gradient-to-br from-gray-800 to-orange-900/10' : 'border-gray-700'
              }`}
            >
              {wallet.recommended && (
                <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Recommended
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{wallet.icon}</span>
                  <div>
                    <h4 className="text-base font-semibold text-white">{wallet.name}</h4>
                    <p className="text-xs text-gray-400">{wallet.description}</p>
                  </div>
                </div>
                <a
                  href={wallet.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-orange-400 transition-colors"
                  title="Download wallet"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {wallet.features.map((feature, i) => (
                  <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                    {feature}
                  </span>
                ))}
              </div>
              <button
                onClick={() => handleBtcConnect(wallet.id)}
                disabled={btcConnecting}
                className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 text-sm ${
                  wallet.recommended
                    ? 'bg-orange-500 hover:bg-orange-600 text-white disabled:bg-orange-500/50'
                    : 'bg-gray-700 hover:bg-gray-600 text-white disabled:bg-gray-700/50'
                }`}
              >
                {btcConnecting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet size={14} />
                    <span>Connect {wallet.name}</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── EVM Wallets Section ── */}
      <div>
        <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>Ξ</span> Ethereum Wallets
          <span className="text-xs font-normal text-gray-500">(YHP NFT verification)</span>
        </h3>
        <div className="p-5 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">🦊</span>
            <div>
              <h4 className="text-base font-semibold text-white">MetaMask / Injected</h4>
              <p className="text-xs text-gray-400">
                Connect to verify Yield Hacker Pass ownership for 0% fees
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">YHP Verification</span>
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">0% Fees</span>
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">Premium Access</span>
          </div>
          <button
            onClick={handleEvmConnect}
            disabled={evmConnecting}
            className="w-full py-2.5 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-600/50"
          >
            {evmConnecting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet size={14} />
                <span>Connect Ethereum Wallet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
          <div>
            <h4 className="text-blue-300 font-medium text-sm mb-1">Security Notice</h4>
            <p className="text-blue-200/80 text-xs leading-relaxed">
              We never store your private keys. All transactions are signed securely in your wallet.
              Make sure you're connecting to the official Cypher Ordi Future platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectWallet;
