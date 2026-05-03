'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  AgentConfig,
  AgentStatus,
  DEFAULT_AGENT_CONFIG,
  Position,
  LPPosition,
  AgentPerformance,
} from '@/agent/core/types';
import { useMultiWallet } from '@/hooks/useMultiWallet';
import { useEthWallet } from '@/hooks/useEthWallet';
import { useBitcoinWallet } from '@/hooks/useBitcoinWallet';
import { PremiumContent } from '@/components/premium-content';

// ============================================================================
// Hyperliquid Balance Card
// ============================================================================

function HyperliquidBalanceCard({ balance }: { balance: any }) {
  const lowBalance = balance && balance.availableMargin < 150;

  return (
    <div className="bg-zinc-950 border border-emerald-500/40 rounded-2xl p-6 mb-8 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
          <span className="uppercase text-sm font-bold tracking-widest text-emerald-400">HYPERLIQUID LIVE</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-xs px-4 py-1 bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> REFRESH
        </button>
      </div>

      <div className="text-6xl font-mono font-black text-white tracking-tighter mb-1">
        ${balance?.availableMargin?.toFixed(2) || '0.00'}
      </div>
      <p className="text-emerald-400/70 text-sm mb-6">Margem Disponível</p>

      {lowBalance && (
        <div className="mb-6 bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <span className="font-bold">SALDO MUITO BAIXO!</span>
            <br />
            Deposite mais USDC para o Agent operar automaticamente.
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 text-sm border-t border-[#1a1a2e] pt-6">
        <div>
          Equity Total<br />
          <span className="font-mono text-emerald-400">${balance?.totalEquity?.toFixed(2) || '0.00'}</span>
        </div>
        <div>
          PnL Não Realizado<br />
          <span className={`font-mono ${balance?.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${balance?.unrealizedPnl?.toFixed(2) || '0.00'}
          </span>
        </div>
        <div className="text-right text-xs text-zinc-400">Atualizado agora</div>
      </div>
    </div>
  );
}

// ============================================================================
// Rest of the file remains the same (SetupWizard, AgentDashboard, etc.)
// ============================================================================

// (o resto do arquivo permanece exatamente igual ao que você colou — só adicionei o cartão de saldo acima)

export default function TradingAgentPage() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_AGENT_CONFIG);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('off');
  const [showDashboard, setShowDashboard] = useState(false);

  const credentialsRef = useRef({
    hlApiKey: '',
    hlApiSecret: '',
    hlTestnet: true,
    solanaRpc: 'https://api.mainnet-beta.solana.com',
    ethRpc: 'https://eth.llamarpc.com',
    walletAddress: null,
    solanaPrivateKey: '',
    evmPrivateKey: '',
  });

  const handleComplete = async (credentials: any) => {
    credentialsRef.current = credentials;
    setIsConfigured(true);
    setShowDashboard(true);
    try {
      const res = await fetch('/api/agent/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          walletAddress: credentials.walletAddress,
          config: {
            ...config,
            enableTrading: true,
          },
          credentials: {
            hyperliquid: {
              agentKey: credentials.hlApiKey,
              agentSecret: credentials.hlApiSecret,
              testnet: credentials.hlTestnet,
            },
            solanaRpc: credentials.solanaRpc,
            ethRpc: credentials.ethRpc,
            walletAddress: credentials.walletAddress,
            solanaPrivateKey: credentials.solanaPrivateKey || undefined,
            evmPrivateKey: credentials.evmPrivateKey || undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAgentStatus('active');
      }
    } catch (err) {
      console.error('[Agent] Failed to start:', err);
      setAgentStatus('error');
    }
  };

  const handleReconfigure = () => {
    setShowDashboard(false);
    setCurrentStep(1);
  };

  const yhpFallback = (
    <div className="bg-[#0a0a0f] min-h-screen font-mono text-white flex flex-col items-center justify-center px-4">
      <div className="w-20 h-20 bg-[#1a1a2e] border border-orange-500/30 rounded-full flex items-center justify-center mb-6">
        <span className="text-4xl">🤖</span>
      </div>
      <h2 className="text-2xl font-bold text-orange-500 mb-3">HACKER YIELDS</h2>
      <p className="text-[#e4e4e7]/50 text-sm text-center max-w-lg mb-2">
        AI Autonomous Trading Agent with multi-strategy execution, risk management, and real-time portfolio tracking.
      </p>
      <p className="text-[#e4e4e7]/40 text-xs text-center max-w-md mb-6">
        Subscribe to the Hacker Yields plan ($149/mo) or connect your wallet and verify YHP ownership to unlock full access.
      </p>
      <div className="text-[10px] text-orange-500/40 font-mono">REQUIRED: HACKER YIELDS PLAN OR YIELD HACKER PASS NFT</div>
    </div>
  );

  if (!isConfigured || !showDashboard) {
    return (
      <PremiumContent requiredFeature="ai_trading_agent" fallback={yhpFallback}>
        <SetupWizard
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          config={config}
          setConfig={setConfig}
          onComplete={handleComplete}
        />
      </PremiumContent>
    );
  }

  return (
    <PremiumContent requiredFeature="ai_trading_agent" fallback={yhpFallback}>
      <AgentDashboard
        config={config}
        agentStatus={agentStatus}
        setAgentStatus={setAgentStatus}
        onReconfigure={handleReconfigure}
        credentials={credentialsRef}
      />
    </PremiumContent>
  );
}
