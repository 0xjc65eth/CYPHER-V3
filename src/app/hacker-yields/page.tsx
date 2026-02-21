'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
// Default empty data (replaced by real API data via hooks)
// ============================================================================

const EMPTY_PERFORMANCE: AgentPerformance = {
  totalPnl: 0,
  totalPnlPercent: 0,
  todayPnl: 0,
  todayPnlPercent: 0,
  weekPnl: 0,
  weekPnlPercent: 0,
  monthPnl: 0,
  monthPnlPercent: 0,
  winRate: 0,
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  sharpeRatio: 0,
  maxDrawdown: 0,
  currentDrawdown: 0,
  uptime: 0,
  startedAt: 0,
};

// ============================================================================
// Market categories for step 4
// ============================================================================

const MARKET_CATEGORIES = [
  { name: 'Crypto Perpetuals (Hyperliquid)', markets: ['BTC-PERP', 'ETH-PERP', 'SOL-PERP', 'ARB-PERP'] },
  { name: 'DeFi LP (No KYC)', markets: ['SOL/USDC', 'ETH/USDC'] },
  { name: 'Synth Stock Perps (Hyperliquid - No KYC)', markets: ['AAPL-PERP', 'TSLA-PERP', 'NVDA-PERP', 'SPY-PERP'] },
  { name: 'Synth Forex Perps (Hyperliquid - No KYC)', markets: ['EUR/USD-PERP', 'GBP/USD-PERP', 'USD/JPY-PERP'] },
  { name: 'Synth Commodity Perps (Hyperliquid - No KYC)', markets: ['GOLD-PERP', 'SILVER-PERP', 'OIL-PERP'] },
];

// ============================================================================
// Types for API response
// ============================================================================

interface AgentApiResponse {
  success: boolean;
  state: {
    status: string;
    uptime: number;
    startedAt: number | null;
    positions: Position[];
    lpPositions: LPPosition[];
    openOrders: any[];
    recentTrades: any[];
    errors: Array<{ message: string; timestamp: number; source: string }>;
    lastCompound: any;
  };
  performance: AgentPerformance;
  config: AgentConfig;
  tradeHistory?: Array<{ pair?: string; direction?: string; pnl?: number; executedAt: number; entry?: number }>;
}

interface TradeRecord {
  pair: string;
  direction: string;
  pnl: number;
  time: string;
  timestamp: number;
  cumulativePnl: number;
}

// ============================================================================
// Equity Curve SVG Chart
// ============================================================================

function EquityCurve({ trades }: { trades: TradeRecord[] }) {
  if (trades.length < 2) {
    return (
      <div className="border border-orange-500/20 rounded-lg bg-[#0a0a0a] p-4">
        <div className="text-[10px] text-orange-400/60 font-mono mb-3">EQUITY CURVE</div>
        <div className="h-40 flex items-center justify-center text-xs text-white/20 font-mono">
          Requires at least 2 trades to display curve
        </div>
      </div>
    );
  }

  const width = 600;
  const height = 160;
  const padding = { top: 10, right: 10, bottom: 25, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const pnls = trades.map(t => t.cumulativePnl);
  const minPnl = Math.min(0, ...pnls);
  const maxPnl = Math.max(0, ...pnls);
  const range = maxPnl - minPnl || 1;

  const scaleX = (i: number) => padding.left + (i / (trades.length - 1)) * chartW;
  const scaleY = (val: number) => padding.top + chartH - ((val - minPnl) / range) * chartH;

  const points = trades.map((t, i) => `${scaleX(i).toFixed(1)},${scaleY(t.cumulativePnl).toFixed(1)}`).join(' ');
  const zeroY = scaleY(0);

  // Grid lines (4 horizontal)
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const val = minPnl + (range * i) / 4;
    return { y: scaleY(val), label: `$${val.toFixed(0)}` };
  });

  return (
    <div className="border border-orange-500/20 rounded-lg bg-[#0a0a0a] p-4">
      <div className="text-[10px] text-orange-400/60 font-mono mb-3">EQUITY CURVE</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line x1={padding.left} y1={line.y} x2={width - padding.right} y2={line.y} stroke="rgba(255,255,255,0.06)" strokeDasharray="2,4" />
            <text x={padding.left - 5} y={line.y + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">{line.label}</text>
          </g>
        ))}

        {/* Zero line */}
        <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} stroke="rgba(255,255,255,0.15)" />

        {/* Fill area */}
        <polygon
          points={`${scaleX(0).toFixed(1)},${zeroY.toFixed(1)} ${points} ${scaleX(trades.length - 1).toFixed(1)},${zeroY.toFixed(1)}`}
          fill={pnls[pnls.length - 1] >= 0 ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)'}
        />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={pnls[pnls.length - 1] >= 0 ? '#f59e0b' : '#ef4444'}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Time labels */}
        {trades.length > 0 && (
          <>
            <text x={padding.left} y={height - 3} fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace">{trades[0].time}</text>
            <text x={width - padding.right} y={height - 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace">{trades[trades.length - 1].time}</text>
          </>
        )}
      </svg>
    </div>
  );
}

// ============================================================================
// Drawdown Meter
// ============================================================================

function DrawdownMeter({ current, max, thresholds }: { current: number; max: number; thresholds: { pause: number; closeAll: number; shutdown: number } }) {
  const pct = current * 100;
  const maxPct = max * 100;

  const getColor = (val: number) => {
    if (val >= 30) return 'bg-red-500';
    if (val >= 20) return 'bg-orange-500';
    if (val >= 10) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getTextColor = (val: number) => {
    if (val >= 30) return 'text-red-400';
    if (val >= 20) return 'text-orange-400';
    if (val >= 10) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  return (
    <div className="border border-orange-500/20 rounded-lg p-4 bg-[#0a0a0a]">
      <div className="text-[10px] text-orange-400/60 font-mono mb-3">DRAWDOWN MONITOR</div>
      <div className="space-y-3">
        {/* Current Drawdown */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-white/40 font-mono">CURRENT DRAWDOWN</span>
            <span className={`text-xs font-mono font-bold ${getTextColor(pct)}`}>{pct.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
            {/* Threshold markers */}
            <div className="absolute h-full w-px bg-yellow-500/50" style={{ left: `${thresholds.pause * 100}%` }} />
            <div className="absolute h-full w-px bg-orange-500/50" style={{ left: `${thresholds.closeAll * 100}%` }} />
            <div className="absolute h-full w-px bg-red-500/50" style={{ left: `${thresholds.shutdown * 100}%` }} />
            {/* Bar */}
            <div className={`h-full ${getColor(pct)} rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct / 0.5, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-yellow-400/40 font-mono">PAUSE {(thresholds.pause * 100).toFixed(0)}%</span>
            <span className="text-[8px] text-orange-400/40 font-mono">CLOSE {(thresholds.closeAll * 100).toFixed(0)}%</span>
            <span className="text-[8px] text-red-400/40 font-mono">STOP {(thresholds.shutdown * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Max Drawdown */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-white/40 font-mono">MAX DRAWDOWN</span>
            <span className="text-xs font-mono font-bold text-red-400">{maxPct.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${Math.min(maxPct / 0.5, 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Emergency Stop Confirmation Dialog
// ============================================================================

function EmergencyStopDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="border border-red-500/50 rounded-lg bg-[#0a0a0a] p-6 max-w-md w-full">
        <div className="text-red-400 font-mono font-bold text-lg mb-2">EMERGENCY STOP</div>
        <p className="text-sm text-white/60 mb-4 leading-relaxed">
          This will immediately close ALL open positions at market price and shut down the trading agent.
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-xs font-mono border border-white/20 text-white/60 rounded hover:bg-white/5 transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-xs font-mono font-bold bg-red-500/20 border border-red-500/50 text-red-400 rounded hover:bg-red-500/30 transition-colors"
          >
            CONFIRM EMERGENCY STOP
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Setup Wizard
// ============================================================================

function SetupWizard({
  currentStep,
  setCurrentStep,
  config,
  setConfig,
  onComplete,
}: {
  currentStep: number;
  setCurrentStep: (s: number) => void;
  config: AgentConfig;
  setConfig: (c: AgentConfig) => void;
  onComplete: (credentials: {
    hlApiKey: string;
    hlApiSecret: string;
    hlTestnet: boolean;
    solanaRpc: string;
    ethRpc: string;
    walletAddress: string | null;
  }) => void;
}) {
  // Real wallet hooks
  const multiWallet = useMultiWallet();
  const ethWallet = useEthWallet();
  const btcWallet = useBitcoinWallet();

  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(
    config.markets.filter(m => m.enabled).map(m => m.pair)
  );
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);

  // API Keys state (stored in-memory, sent to backend on activate)
  const [hlApiKey, setHlApiKey] = useState('');
  const [hlApiSecret, setHlApiSecret] = useState('');
  const [solanaRpc, setSolanaRpc] = useState('https://api.mainnet-beta.solana.com');
  const [ethRpc, setEthRpc] = useState('https://eth.llamarpc.com');
  const [hlTestnet, setHlTestnet] = useState(true);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Determine which wallets are connected
  const evmConnected = ethWallet.isConnected;
  const solanaConnected = !!multiWallet.solana?.activeConnection;
  const btcConnected = btcWallet.walletState.isConnected;

  const walletConnected = evmConnected
    ? 'MetaMask'
    : solanaConnected
    ? 'Phantom'
    : btcConnected
    ? 'Xverse'
    : null;

  const connectedAddress = ethWallet.address
    || multiWallet.solana?.activeConnection?.address
    || btcWallet.walletState.address
    || null;

  const steps = [
    { num: 1, title: 'Connect Wallet' },
    { num: 2, title: 'Exchange Keys' },
    { num: 3, title: 'Risk Limits' },
    { num: 4, title: 'Markets' },
    { num: 5, title: 'Review' },
  ];

  const toggleMarket = (pair: string) => {
    setSelectedMarkets(prev =>
      prev.includes(pair) ? prev.filter(p => p !== pair) : [...prev, pair]
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-orange-500/30 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-orange-500/60 font-mono tracking-wider">HACKER YIELDS CYPHER</div>
              <h1 className="text-xl font-bold text-orange-400 font-mono">SETUP WIZARD</h1>
            </div>
            <Link href="/" className="text-xs text-white/40 hover:text-white/60 font-mono">
              ESC: EXIT
            </Link>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-8">
          {steps.map((step, i) => (
            <div key={step.num} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => step.num <= currentStep && setCurrentStep(step.num)}
                className={`flex items-center gap-2 px-3 py-2 rounded font-mono text-xs transition-colors w-full ${
                  step.num === currentStep
                    ? 'bg-orange-500/20 border border-orange-500/50 text-orange-400'
                    : step.num < currentStep
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-pointer'
                    : 'bg-white/5 border border-white/10 text-white/30'
                }`}
              >
                <span className="font-bold">{step.num < currentStep ? '>' : step.num}</span>
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {i < steps.length - 1 && <div className="w-4 h-px bg-white/10 flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="border border-orange-500/20 rounded-lg bg-[#0a0a0a] p-6">
          {/* Step 1: Connect Wallet */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-lg font-bold text-orange-400 font-mono mb-2">CONNECT YOUR WALLET</h2>
              <p className="text-sm text-white/50 mb-6">
                Connect the wallet(s) that will control the trading agent. You can connect multiple chains.
                All exchanges are <span className="text-emerald-400 font-bold">NO KYC</span>.
              </p>

              {/* Wallet Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                  { name: 'MetaMask', desc: 'Hyperliquid Perps + Uniswap LP', chain: 'EVM', connected: evmConnected, address: ethWallet.address },
                  { name: 'Phantom', desc: 'Jupiter/Raydium LP + Solana DEX', chain: 'Solana', connected: solanaConnected, address: multiWallet.solana?.activeConnection?.address },
                  { name: 'Xverse', desc: 'Bitcoin Ordinals & Runes', chain: 'Bitcoin', connected: btcConnected, address: btcWallet.walletState.address },
                ].map(w => (
                  <button
                    key={w.name}
                    onClick={async () => {
                      setConnectingWallet(w.name);
                      try {
                        if (w.name === 'MetaMask') {
                          await ethWallet.connectEth();
                        } else if (w.name === 'Phantom') {
                          await multiWallet.connectSolanaWallet('phantom');
                        } else if (w.name === 'Xverse') {
                          btcWallet.detectWallets();
                          await btcWallet.connect('xverse');
                        }
                      } catch (error) {
                        console.error(`Failed to connect ${w.name}:`, error);
                        alert(`Failed to connect ${w.name}. Make sure the wallet extension is installed.`);
                      } finally {
                        setConnectingWallet(null);
                      }
                    }}
                    disabled={connectingWallet !== null}
                    className={`p-4 rounded-lg border transition-all text-left ${
                      w.connected
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : connectingWallet === w.name
                        ? 'border-orange-500/50 bg-orange-500/10 opacity-50 cursor-wait'
                        : 'border-white/10 bg-white/5 hover:border-orange-500/30 hover:bg-white/10 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-sm text-white">{w.name}</span>
                      <span className="text-[10px] font-mono text-white/20">{w.chain}</span>
                    </div>
                    <div className="text-xs text-white/40">{w.desc}</div>
                    {connectingWallet === w.name && (
                      <div className="text-xs text-orange-400 mt-2 font-mono animate-pulse">CONNECTING...</div>
                    )}
                    {w.connected && connectingWallet !== w.name && (
                      <div className="text-xs text-emerald-400 mt-2 font-mono">
                        CONNECTED: {w.address ? `${w.address.slice(0, 6)}...${w.address.slice(-4)}` : ''}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Connection Status Summary */}
              <div className={`text-xs font-mono p-3 rounded border ${
                (evmConnected || solanaConnected || btcConnected)
                  ? 'text-emerald-400/80 bg-emerald-500/5 border-emerald-500/20'
                  : 'text-yellow-400/80 bg-yellow-500/5 border-yellow-500/20'
              }`}>
                {(evmConnected || solanaConnected || btcConnected) ? (
                  <div className="space-y-1">
                    {evmConnected && <div>EVM (MetaMask): {ethWallet.address?.slice(0, 6)}...{ethWallet.address?.slice(-4)} — Ready for Hyperliquid + Uniswap</div>}
                    {solanaConnected && <div>Solana (Phantom): {multiWallet.solana?.activeConnection?.address?.slice(0, 6)}... — Ready for Jupiter/Raydium</div>}
                    {btcConnected && <div>Bitcoin (Xverse): {btcWallet.walletState.address?.slice(0, 6)}... — Ready for Ordinals</div>}
                  </div>
                ) : (
                  <div>Connect at least one wallet to continue. MetaMask is required for Hyperliquid perp trading.</div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Exchange API Keys */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-lg font-bold text-orange-400 font-mono mb-2">EXCHANGE API KEYS</h2>
              <p className="text-sm text-white/50 mb-6">
                Enter your API credentials. All exchanges are <span className="text-emerald-400 font-bold">NO KYC</span>.
                Keys are sent to the server securely and encrypted at rest.
              </p>

              {/* Hyperliquid - REQUIRED */}
              <div className="border border-orange-500/30 rounded-lg p-5 bg-orange-500/5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">HYPERLIQUID</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">REQUIRED</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">NO KYC</span>
                  </div>
                  {evmConnected && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">WALLET CONNECTED</span>
                  )}
                </div>
                <p className="text-xs text-white/40 mb-4">
                  All perps: Crypto, Synth Stocks, Forex, Commodities — 24/7 trading on Hyperliquid L1.
                  Get your API key at <span className="text-orange-400">app.hyperliquid.xyz</span> → API → Create Agent Wallet.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-white/30 font-mono block mb-1">AGENT WALLET KEY *</label>
                    <div className="relative">
                      <input
                        type={showKeys['hl_key'] ? 'text' : 'password'}
                        value={hlApiKey}
                        onChange={e => setHlApiKey(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs font-mono text-white placeholder-white/20 focus:border-orange-500/50 focus:outline-none pr-16"
                      />
                      <button onClick={() => setShowKeys(p => ({ ...p, hl_key: !p.hl_key }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30 font-mono hover:text-white/60">
                        {showKeys['hl_key'] ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 font-mono block mb-1">AGENT WALLET SECRET *</label>
                    <div className="relative">
                      <input
                        type={showKeys['hl_secret'] ? 'text' : 'password'}
                        value={hlApiSecret}
                        onChange={e => setHlApiSecret(e.target.value)}
                        placeholder="Enter secret..."
                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs font-mono text-white placeholder-white/20 focus:border-orange-500/50 focus:outline-none pr-16"
                      />
                      <button onClick={() => setShowKeys(p => ({ ...p, hl_secret: !p.hl_secret }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30 font-mono hover:text-white/60">
                        {showKeys['hl_secret'] ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={hlTestnet} onChange={e => setHlTestnet(e.target.checked)} className="accent-orange-500" />
                    <label className="text-xs text-white/60 font-mono">Use Testnet (recommended for first run)</label>
                  </div>
                  {hlApiKey && hlApiSecret && (
                    <div className="text-[10px] text-emerald-400 font-mono mt-1">Keys configured</div>
                  )}
                </div>
              </div>

              {/* Jupiter / Solana - OPTIONAL */}
              <div className="border border-white/10 rounded-lg p-5 bg-white/[0.02] mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">JUPITER / RAYDIUM (Solana)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/40">OPTIONAL</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">NO KYC</span>
                  </div>
                  {solanaConnected && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">PHANTOM CONNECTED</span>
                  )}
                </div>
                <p className="text-xs text-white/40 mb-3">LP positions + DEX swaps on Solana. Signing via Phantom wallet.</p>
                <div>
                  <label className="text-[10px] text-white/30 font-mono block mb-1">SOLANA RPC URL</label>
                  <input
                    type="text"
                    value={solanaRpc}
                    onChange={e => setSolanaRpc(e.target.value)}
                    placeholder="https://api.mainnet-beta.solana.com"
                    className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs font-mono text-white placeholder-white/20 focus:border-orange-500/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Uniswap / EVM - OPTIONAL */}
              <div className="border border-white/10 rounded-lg p-5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">UNISWAP V3 (EVM)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/40">OPTIONAL</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">NO KYC</span>
                  </div>
                  {evmConnected && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">METAMASK CONNECTED</span>
                  )}
                </div>
                <p className="text-xs text-white/40 mb-3">Concentrated LP positions on Ethereum/Arbitrum. Signing via MetaMask.</p>
                <div>
                  <label className="text-[10px] text-white/30 font-mono block mb-1">EVM RPC URL</label>
                  <input
                    type="text"
                    value={ethRpc}
                    onChange={e => setEthRpc(e.target.value)}
                    placeholder="https://eth.llamarpc.com"
                    className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs font-mono text-white placeholder-white/20 focus:border-orange-500/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Validation Warning */}
              {!hlApiKey && !hlApiSecret && (
                <div className="mt-4 border border-yellow-500/30 rounded-lg p-3 bg-yellow-500/5">
                  <p className="text-xs text-yellow-400/80 font-mono">
                    Hyperliquid API key is required for perp trading. You can still proceed to configure risk limits and markets.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Risk Limits */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-lg font-bold text-orange-400 font-mono mb-2">RISK MANAGEMENT</h2>
              <p className="text-sm text-white/50 mb-6">
                Configure capital allocation and risk parameters. These limits protect your portfolio.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Capital Allocation */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono text-orange-400/80 font-bold">CAPITAL ALLOCATION</h3>
                  <div>
                    <label className="text-[10px] text-white/30 font-mono block mb-1">Total Capital (USD)</label>
                    <input
                      type="number"
                      value={config.capitalAllocation.total}
                      onChange={e => setConfig({ ...config, capitalAllocation: { ...config.capitalAllocation, total: Number(e.target.value) } })}
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm font-mono text-white focus:border-orange-500/50 focus:outline-none"
                    />
                  </div>
                  {[
                    { key: 'lp' as const, label: 'LP Allocation' },
                    { key: 'mm' as const, label: 'Market Making' },
                    { key: 'scalp' as const, label: 'Scalping' },
                  ].map(item => (
                    <div key={item.key}>
                      <div className="flex justify-between mb-1">
                        <label className="text-[10px] text-white/30 font-mono">{item.label}</label>
                        <span className="text-[10px] text-orange-400 font-mono">{Math.round(config.capitalAllocation[item.key] * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0" max="100" step="5"
                        value={config.capitalAllocation[item.key] * 100}
                        onChange={e => setConfig({ ...config, capitalAllocation: { ...config.capitalAllocation, [item.key]: Number(e.target.value) / 100 } })}
                        className="w-full accent-orange-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Risk Limits */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono text-orange-400/80 font-bold">RISK LIMITS</h3>
                  <div>
                    <label className="text-[10px] text-white/30 font-mono block mb-1">Max Leverage</label>
                    <input
                      type="number"
                      min="1" max="20"
                      value={config.riskLimits.maxLeverage}
                      onChange={e => setConfig({ ...config, riskLimits: { ...config.riskLimits, maxLeverage: Number(e.target.value) } })}
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm font-mono text-white focus:border-orange-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[10px] text-white/30 font-mono">Max Daily Drawdown</label>
                      <span className="text-[10px] text-red-400 font-mono">{Math.round(config.riskLimits.maxDailyDrawdown * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="1" max="20" step="1"
                      value={config.riskLimits.maxDailyDrawdown * 100}
                      onChange={e => setConfig({ ...config, riskLimits: { ...config.riskLimits, maxDailyDrawdown: Number(e.target.value) / 100 } })}
                      className="w-full accent-red-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[10px] text-white/30 font-mono">Max Total Drawdown</label>
                      <span className="text-[10px] text-red-400 font-mono">{Math.round(config.riskLimits.maxTotalDrawdown * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="5" max="50" step="5"
                      value={config.riskLimits.maxTotalDrawdown * 100}
                      onChange={e => setConfig({ ...config, riskLimits: { ...config.riskLimits, maxTotalDrawdown: Number(e.target.value) / 100 } })}
                      className="w-full accent-red-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      checked={config.autoCompound.enabled}
                      onChange={e => setConfig({ ...config, autoCompound: { ...config.autoCompound, enabled: e.target.checked } })}
                      className="accent-orange-500"
                    />
                    <label className="text-xs text-white/60 font-mono">Auto-compound profits</label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Markets & Pairs */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-lg font-bold text-orange-400 font-mono mb-2">SELECT MARKETS</h2>
              <p className="text-sm text-white/50 mb-6">
                Choose which markets and pairs your agent will trade. You can change this later.
              </p>
              <div className="space-y-6">
                {MARKET_CATEGORIES.map(cat => (
                  <div key={cat.name}>
                    <h3 className="text-xs font-mono text-orange-400/80 font-bold mb-3">{cat.name.toUpperCase()}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {cat.markets.map(pair => (
                        <button
                          key={pair}
                          onClick={() => toggleMarket(pair)}
                          className={`px-3 py-2 rounded text-xs font-mono border transition-colors text-left ${
                            selectedMarkets.includes(pair)
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                              : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20'
                          }`}
                        >
                          {selectedMarkets.includes(pair) ? '> ' : '  '}{pair}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="text-xs text-white/30 font-mono">
                  {selectedMarkets.length} markets selected
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Activate */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-lg font-bold text-orange-400 font-mono mb-2">REVIEW & ACTIVATE</h2>
              <p className="text-sm text-white/50 mb-6">
                Review your configuration before activating the trading agent.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Wallets & Keys */}
                <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                  <div className="text-[10px] text-orange-400/60 font-mono mb-2">WALLETS & KEYS</div>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${evmConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className="text-white/40">MetaMask:</span>
                      <span className={evmConnected ? 'text-emerald-400' : 'text-red-400'}>{evmConnected ? `${ethWallet.address?.slice(0, 6)}...${ethWallet.address?.slice(-4)}` : 'Not connected'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${solanaConnected ? 'bg-emerald-400' : 'bg-white/20'}`} />
                      <span className="text-white/40">Phantom:</span>
                      <span className={solanaConnected ? 'text-emerald-400' : 'text-white/20'}>{solanaConnected ? 'Connected' : 'Optional'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${hlApiKey ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className="text-white/40">Hyperliquid:</span>
                      <span className={hlApiKey ? 'text-emerald-400' : 'text-red-400'}>{hlApiKey ? `Key: ${hlApiKey.slice(0, 6)}... ${hlTestnet ? '(TESTNET)' : '(MAINNET)'}` : 'No API key'}</span>
                    </div>
                  </div>
                </div>

                {/* Capital */}
                <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                  <div className="text-[10px] text-orange-400/60 font-mono mb-2">CAPITAL</div>
                  <div className="text-lg font-mono text-white font-bold">${config.capitalAllocation.total.toLocaleString()}</div>
                  <div className="mt-2 space-y-1 text-xs text-white/40 font-mono">
                    <div>LP: {Math.round(config.capitalAllocation.lp * 100)}% (${Math.round(config.capitalAllocation.total * config.capitalAllocation.lp).toLocaleString()})</div>
                    <div>MM: {Math.round(config.capitalAllocation.mm * 100)}% (${Math.round(config.capitalAllocation.total * config.capitalAllocation.mm).toLocaleString()})</div>
                    <div>Scalp: {Math.round(config.capitalAllocation.scalp * 100)}% (${Math.round(config.capitalAllocation.total * config.capitalAllocation.scalp).toLocaleString()})</div>
                  </div>
                </div>

                {/* Risk */}
                <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                  <div className="text-[10px] text-orange-400/60 font-mono mb-2">RISK LIMITS</div>
                  <div className="space-y-1 text-xs text-white/40 font-mono">
                    <div>Max Leverage: <span className="text-white">{config.riskLimits.maxLeverage}x</span></div>
                    <div>Daily Drawdown: <span className="text-red-400">{Math.round(config.riskLimits.maxDailyDrawdown * 100)}%</span></div>
                    <div>Total Drawdown: <span className="text-red-400">{Math.round(config.riskLimits.maxTotalDrawdown * 100)}%</span></div>
                    <div>Auto-Compound: <span className={config.autoCompound.enabled ? 'text-emerald-400' : 'text-white/30'}>{config.autoCompound.enabled ? 'ON' : 'OFF'}</span></div>
                  </div>
                </div>

                {/* Markets */}
                <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                  <div className="text-[10px] text-orange-400/60 font-mono mb-2">MARKETS ({selectedMarkets.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMarkets.map(m => (
                      <span key={m} className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">{m}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="border border-yellow-500/30 rounded-lg p-4 bg-yellow-500/5 mb-4">
                <div className="text-[10px] text-yellow-400 font-mono font-bold mb-2">RISK DISCLAIMER</div>
                <p className="text-xs text-yellow-400/70 leading-relaxed">
                  Automated trading involves substantial risk of loss. Past performance is not indicative of future results.
                  You are solely responsible for all trading activity and outcomes. The agent operates with delegated
                  authority over your configured capital. Ensure you understand the risks before activating.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  className="accent-orange-500"
                />
                <span className="text-xs text-white/60 font-mono">I understand the risks and wish to activate the trading agent</span>
              </label>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 text-xs font-mono border border-white/10 rounded text-white/40 hover:text-white/60 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            BACK
          </button>
          <div className="flex items-center gap-3">
            {/* Step validation hints */}
            {currentStep === 1 && !walletConnected && (
              <span className="text-[10px] text-yellow-400/60 font-mono">Connect a wallet first</span>
            )}
            {currentStep === 2 && !hlApiKey && (
              <span className="text-[10px] text-yellow-400/60 font-mono">Hyperliquid key recommended</span>
            )}
            {currentStep < 5 ? (
              <button
                onClick={() => {
                  // Update config markets based on selected markets before moving to next step
                  if (currentStep === 4) {
                    const updatedMarkets = config.markets.map(m => ({
                      ...m,
                      enabled: selectedMarkets.includes(m.pair),
                    }));
                    setConfig({ ...config, markets: updatedMarkets });
                  }
                  setCurrentStep(currentStep + 1);
                }}
                disabled={currentStep === 1 && !walletConnected}
                className="px-6 py-2 text-xs font-mono font-bold bg-orange-500/20 border border-orange-500/50 rounded text-orange-400 hover:bg-orange-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                NEXT
              </button>
            ) : (
              <button
                onClick={() => onComplete({
                  hlApiKey,
                  hlApiSecret,
                  hlTestnet,
                  solanaRpc,
                  ethRpc,
                  walletAddress: connectedAddress,
                })}
                disabled={!agreedToTerms || !hlApiKey || !hlApiSecret}
                className="px-6 py-2 text-xs font-mono font-bold bg-emerald-500/20 border border-emerald-500/50 rounded text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ACTIVATE AGENT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Agent Dashboard
// ============================================================================

function AgentDashboard({
  config,
  agentStatus,
  setAgentStatus,
  onReconfigure,
}: {
  config: AgentConfig;
  agentStatus: AgentStatus;
  setAgentStatus: (s: AgentStatus) => void;
  onReconfigure: () => void;
}) {
  const [perf, setPerf] = useState<AgentPerformance>(EMPTY_PERFORMANCE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [lpPositions, setLpPositions] = useState<LPPosition[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeRecord[]>([]);
  const [allTrades, setAllTrades] = useState<TradeRecord[]>([]);
  const [errors, setErrors] = useState<Array<{ message: string; timestamp: number; source: string }>>([]);
  const [consensusDecisions, setConsensusDecisions] = useState<any[]>([]);
  const [sessionKeys, setSessionKeys] = useState<any[]>([]);
  const [connectedExchanges, setConnectedExchanges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [uptime, setUptime] = useState(0);
  const startedAtRef = useRef<number>(0);

  // Map API status string to local AgentStatus
  const mapApiStatus = useCallback((apiStatus: string): AgentStatus => {
    switch (apiStatus) {
      case 'running': return 'active';
      case 'paused': return 'paused';
      case 'stopped': return 'off';
      case 'emergency_stopped': return 'emergency_stop';
      case 'error': return 'error';
      default: return 'off';
    }
  }, []);

  // Fetch data from API
  const fetchAgentData = useCallback(async (signal?: AbortSignal) => {
    try {
      const url = agentStatus === 'active'
        ? '/api/agent?include=trades'
        : '/api/agent';

      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data: AgentApiResponse = await res.json();
      if (!data.success) throw new Error('API returned unsuccessful response');

      // Update agent status from API
      const apiStatus = mapApiStatus(data.state.status);
      if (apiStatus !== agentStatus && actionInProgress === null) {
        setAgentStatus(apiStatus);
      }

      // Update performance from dedicated performance field
      if (data.performance) {
        setPerf(data.performance);
      }

      // Update positions
      setPositions(data.state.positions || []);
      setLpPositions(data.state.lpPositions || []);
      setErrors(data.state.errors || []);

      // Update started time
      if (data.state.startedAt) {
        startedAtRef.current = data.state.startedAt;
      }

      // Map recent trades from state
      if (data.state.recentTrades?.length > 0) {
        const mapped: TradeRecord[] = data.state.recentTrades.slice(0, 10).map((t: any, idx: number) => ({
          pair: t.pair || 'BTC-PERP',
          direction: t.direction || 'long',
          pnl: t.realizedPnl || t.pnl || 0,
          time: new Date(t.timestamp || Date.now()).toLocaleTimeString(),
          timestamp: t.timestamp || Date.now(),
          cumulativePnl: 0,
        }));
        setRecentTrades(mapped);
      }

      // Build equity curve from trade history
      if (data.tradeHistory?.length) {
        let cumPnl = 0;
        const mapped: TradeRecord[] = data.tradeHistory.map((t: any) => {
          cumPnl += (t.realizedPnl || t.pnl || 0);
          return {
            pair: t.pair || 'BTC-PERP',
            direction: t.direction || 'long',
            pnl: t.realizedPnl || t.pnl || 0,
            time: new Date(t.executedAt || t.timestamp || Date.now()).toLocaleTimeString(),
            timestamp: t.executedAt || t.timestamp || Date.now(),
            cumulativePnl: cumPnl,
          };
        });
        setAllTrades(mapped);
      }

      // Fetch consensus decisions (non-blocking)
      try {
        const consensusRes = await fetch('/api/agent/consensus/?limit=10', { signal });
        if (consensusRes.ok) {
          const consensusData = await consensusRes.json();
          if (consensusData.success) setConsensusDecisions(consensusData.decisions || []);
        }
      } catch { /* non-critical */ }

      // Fetch session keys (non-blocking)
      try {
        const keysRes = await fetch('/api/agent/session-keys/', { signal });
        if (keysRes.ok) {
          const keysData = await keysRes.json();
          if (keysData.success) setSessionKeys(keysData.keys || []);
        }
      } catch { /* non-critical */ }

      // Detect connected exchanges from config
      const exchanges = (data.config?.markets || [])
        .filter((m: any) => m.enabled)
        .map((m: any) => m.exchange)
        .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
      setConnectedExchanges(exchanges);

      setFetchError(null);
      setLoading(false);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('[Dashboard] Fetch error:', err);
      setFetchError(err.message || 'Failed to fetch agent data');
      setLoading(false);
    }
  }, [agentStatus, mapApiStatus, setAgentStatus, actionInProgress]);

  // Polling: 3s when running, 15s when stopped/paused
  useEffect(() => {
    const controller = new AbortController();
    fetchAgentData(controller.signal);

    const intervalMs = agentStatus === 'active' ? 3000 : 15000;
    const interval = setInterval(() => fetchAgentData(controller.signal), intervalMs);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [agentStatus, fetchAgentData]);

  // Uptime counter
  useEffect(() => {
    if (agentStatus !== 'active') return;
    const interval = setInterval(() => {
      if (startedAtRef.current) {
        setUptime(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [agentStatus]);

  // API action helper
  const executeAction = useCallback(async (action: string, extraBody?: Record<string, any>) => {
    setActionInProgress(action);
    try {
      const res = await fetch('/api/agent/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraBody }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Action failed');

      // Update local status based on action
      switch (action) {
        case 'start': setAgentStatus('active'); break;
        case 'stop': setAgentStatus('off'); break;
        case 'pause': setAgentStatus('paused'); break;
        case 'resume': setAgentStatus('active'); break;
        case 'emergency_stop': setAgentStatus('emergency_stop'); break;
      }
    } catch (err) {
      console.error(`[Agent] ${action} failed:`, err);
      setFetchError(`Failed to execute ${action}`);
    } finally {
      setActionInProgress(null);
    }
  }, [setAgentStatus]);

  const handleStart = useCallback(() => {
    executeAction('start', {
      config: {
        testnet: true,
        portfolioUSD: config.capitalAllocation.total,
        maxRiskPercent: config.riskLimits.maxDailyDrawdown * 100,
        enableTrading: false,
      },
    });
  }, [executeAction, config]);

  const handleStop = useCallback(() => executeAction('stop'), [executeAction]);
  const handlePause = useCallback(() => executeAction('pause'), [executeAction]);
  const handleResume = useCallback(() => executeAction('resume'), [executeAction]);
  const handleEmergencyStop = useCallback(() => {
    setShowEmergencyDialog(false);
    executeAction('emergency_stop');
  }, [executeAction]);

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${d}d ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const statusConfig: Record<AgentStatus, { css: string; pulse: boolean }> = {
    active: { css: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', pulse: true },
    paused: { css: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', pulse: false },
    off: { css: 'text-white/40 bg-white/5 border-white/10', pulse: false },
    configuring: { css: 'text-blue-400 bg-blue-500/10 border-blue-500/30', pulse: false },
    error: { css: 'text-red-400 bg-red-500/10 border-red-500/30', pulse: false },
    emergency_stop: { css: 'text-red-400 bg-red-500/20 border-red-500/50', pulse: false },
  };

  const currentStatusConfig = statusConfig[agentStatus];
  const statusLabel = agentStatus.toUpperCase().replace('_', ' ');

  return (
    <div className="min-h-screen bg-black text-white">
      {showEmergencyDialog && (
        <EmergencyStopDialog
          onConfirm={handleEmergencyStop}
          onCancel={() => setShowEmergencyDialog(false)}
        />
      )}

      {/* Header */}
      <div className="border-b border-orange-500/30 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-[10px] text-orange-500/60 font-mono tracking-wider">HACKER YIELDS</div>
                <h1 className="text-lg font-bold text-orange-400 font-mono">CYPHER</h1>
              </div>
              <div className={`px-3 py-1 rounded border text-xs font-mono font-bold flex items-center ${currentStatusConfig.css}`}>
                {currentStatusConfig.pulse && (
                  <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse" />
                )}
                {agentStatus === 'emergency_stop' && (
                  <span className="inline-block w-1.5 h-1.5 bg-red-400 rounded-full mr-1.5" />
                )}
                {statusLabel}
              </div>
              {agentStatus === 'active' && (
                <span className="text-xs text-white/30 font-mono">UPTIME: {formatUptime(uptime)}</span>
              )}
              {actionInProgress && (
                <span className="text-xs text-orange-400/60 font-mono animate-pulse">{actionInProgress.toUpperCase()}...</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {agentStatus === 'active' && (
                <button
                  onClick={handlePause}
                  disabled={actionInProgress !== null}
                  className="px-3 py-1.5 text-xs font-mono border border-yellow-500/50 text-yellow-400 rounded hover:bg-yellow-500/10 transition-colors disabled:opacity-30"
                >
                  PAUSE
                </button>
              )}
              {agentStatus === 'paused' && (
                <button
                  onClick={handleResume}
                  disabled={actionInProgress !== null}
                  className="px-3 py-1.5 text-xs font-mono border border-emerald-500/50 text-emerald-400 rounded hover:bg-emerald-500/10 transition-colors disabled:opacity-30"
                >
                  RESUME
                </button>
              )}
              {(agentStatus === 'off' || agentStatus === 'emergency_stop') && (
                <button
                  onClick={handleStart}
                  disabled={actionInProgress !== null}
                  className="px-3 py-1.5 text-xs font-mono border border-emerald-500/50 text-emerald-400 rounded hover:bg-emerald-500/10 transition-colors disabled:opacity-30"
                >
                  START
                </button>
              )}
              {agentStatus === 'active' && (
                <button
                  onClick={handleStop}
                  disabled={actionInProgress !== null}
                  className="px-3 py-1.5 text-xs font-mono border border-white/20 text-white/50 rounded hover:bg-white/5 transition-colors disabled:opacity-30"
                >
                  STOP
                </button>
              )}
              <button
                onClick={onReconfigure}
                className="px-3 py-1.5 text-xs font-mono border border-white/10 text-white/40 rounded hover:bg-white/10 transition-colors"
              >
                CONFIG
              </button>
              <button
                onClick={() => setShowEmergencyDialog(true)}
                disabled={agentStatus === 'off' || agentStatus === 'emergency_stop' || actionInProgress !== null}
                className="px-3 py-1.5 text-xs font-mono font-bold border border-red-500/50 text-red-400 rounded hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                EMERGENCY STOP
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <div className="text-orange-400 font-mono animate-pulse">LOADING AGENT DATA...</div>
        </div>
      )}

      {/* Error Banner */}
      {fetchError && !loading && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="border border-red-500/30 rounded-lg p-3 bg-red-500/5 text-xs text-red-400 font-mono">
            {fetchError}
          </div>
        </div>
      )}

      {!loading && (
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          {/* Performance Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'PnL Today', value: perf.todayPnl, pct: perf.todayPnlPercent },
              { label: 'PnL Week', value: perf.weekPnl, pct: perf.weekPnlPercent },
              { label: 'PnL Month', value: perf.monthPnl, pct: perf.monthPnlPercent },
              { label: 'Total PnL', value: perf.totalPnl, pct: perf.totalPnlPercent },
            ].map(card => (
              <div key={card.label} className="border border-orange-500/20 rounded-lg p-3 bg-[#0a0a0a]">
                <div className="text-[10px] text-white/30 font-mono mb-1">{card.label.toUpperCase()}</div>
                <div className={`text-lg font-mono font-bold ${card.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {card.value >= 0 ? '+' : ''}${card.value.toFixed(2)}
                </div>
                <div className={`text-xs font-mono ${card.value >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                  {card.value >= 0 ? '+' : ''}{card.pct.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Win Rate', value: `${(perf.winRate * 100).toFixed(1)}%`, color: 'text-emerald-400' },
              { label: 'Sharpe Ratio', value: perf.sharpeRatio.toFixed(2), color: 'text-orange-400' },
              { label: 'Total Trades', value: perf.totalTrades.toString(), color: 'text-white' },
              { label: 'Winning', value: `${perf.winningTrades} / ${perf.losingTrades}`, color: 'text-emerald-400' },
              { label: 'Current DD', value: `${(perf.currentDrawdown * 100).toFixed(1)}%`, color: perf.currentDrawdown > 0.2 ? 'text-red-400' : perf.currentDrawdown > 0.1 ? 'text-yellow-400' : 'text-white/60' },
            ].map(stat => (
              <div key={stat.label} className="border border-white/10 rounded-lg p-3 bg-[#0a0a0a]">
                <div className="text-[10px] text-white/30 font-mono">{stat.label.toUpperCase()}</div>
                <div className={`text-sm font-mono font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Equity Curve + Drawdown Meter */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <EquityCurve trades={allTrades} />
            </div>
            <DrawdownMeter
              current={perf.currentDrawdown}
              max={perf.maxDrawdown}
              thresholds={{
                pause: config.riskLimits.pauseOnDrawdown,
                closeAll: config.riskLimits.closeAllOnDrawdown,
                shutdown: config.riskLimits.shutdownOnDrawdown,
              }}
            />
          </div>

          {/* Capital Allocation */}
          <div className="border border-orange-500/20 rounded-lg p-4 bg-[#0a0a0a]">
            <div className="text-[10px] text-orange-400/60 font-mono mb-3">CAPITAL ALLOCATION</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-white/30 font-mono">Total Capital</div>
                <div className="text-lg font-mono font-bold text-white">${config.capitalAllocation.total.toLocaleString()}</div>
              </div>
              {[
                { label: 'LP', pct: config.capitalAllocation.lp, color: 'bg-blue-500' },
                { label: 'Market Making', pct: config.capitalAllocation.mm, color: 'bg-purple-500' },
                { label: 'Scalping', pct: config.capitalAllocation.scalp, color: 'bg-orange-500' },
              ].map(a => (
                <div key={a.label}>
                  <div className="text-xs text-white/30 font-mono">{a.label}</div>
                  <div className="text-sm font-mono font-bold text-white">
                    ${Math.round(config.capitalAllocation.total * a.pct).toLocaleString()}
                    <span className="text-white/30 text-xs ml-1">({Math.round(a.pct * 100)}%)</span>
                  </div>
                  <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${a.color} rounded-full`} style={{ width: `${a.pct * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Open Positions */}
            <div className="border border-orange-500/20 rounded-lg bg-[#0a0a0a]">
              <div className="px-4 py-3 border-b border-white/5">
                <div className="text-[10px] text-orange-400/60 font-mono">OPEN POSITIONS ({positions.length})</div>
              </div>
              <div className="divide-y divide-white/5">
                {positions.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-white/20 font-mono">
                    {agentStatus === 'active' ? 'Waiting for trade signals...' : 'No open positions -- Start the agent to begin trading'}
                  </div>
                )}
                {positions.map(pos => (
                  <div key={pos.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold text-white">{pos.pair}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          pos.direction === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>{pos.direction.toUpperCase()} {pos.leverage}x</span>
                      </div>
                      <div className="text-[10px] text-white/30 font-mono mt-0.5">
                        Entry: ${pos.entryPrice.toLocaleString()} | Size: ${pos.marginUsed.toFixed(0)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-mono font-bold ${pos.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-white/30 font-mono">
                        SL: ${pos.stopLoss.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Trades */}
            <div className="border border-orange-500/20 rounded-lg bg-[#0a0a0a]">
              <div className="px-4 py-3 border-b border-white/5">
                <div className="text-[10px] text-orange-400/60 font-mono">RECENT TRADES</div>
              </div>
              <div className="divide-y divide-white/5">
                {recentTrades.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-white/20 font-mono">
                    {agentStatus === 'active' ? 'Analyzing markets...' : 'No trades yet -- Agent will trade when active'}
                  </div>
                )}
                {recentTrades.map((trade, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-white">{trade.pair}</span>
                      <span className={`text-[10px] font-mono ${trade.direction === 'long' ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                        {trade.direction.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-white/20 font-mono w-12 text-right">{trade.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LP Positions */}
          <div className="border border-orange-500/20 rounded-lg bg-[#0a0a0a]">
            <div className="px-4 py-3 border-b border-white/5">
              <div className="text-[10px] text-orange-400/60 font-mono">LP POSITIONS ({lpPositions.length})</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/5">
              {lpPositions.length === 0 && (
                <div className="p-6 text-center text-xs text-white/20 font-mono md:col-span-2">
                  No LP positions -- Agent will create positions when configured
                </div>
              )}
              {lpPositions.map(lp => (
                <div key={lp.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-white">{lp.pair}</span>
                      <span className="text-[10px] font-mono text-white/30">{lp.protocol}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      lp.inRange ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>{lp.inRange ? 'IN RANGE' : 'OUT OF RANGE'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div>
                      <div className="text-white/30">Value</div>
                      <div className="text-white">${lp.valueUSD.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-white/30">Fees</div>
                      <div className="text-emerald-400">${(lp.unclaimedFees.token1 + lp.unclaimedFees.token0 * 190).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-white/30">IL</div>
                      <div className="text-red-400">{lp.impermanentLoss.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Consensus Panel + Multi-Exchange + Session Keys */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Consensus Decisions */}
            <div className="border border-orange-500/20 rounded-lg bg-[#0a0a0a]">
              <div className="px-4 py-3 border-b border-white/5">
                <div className="text-[10px] text-orange-400/60 font-mono">AI CONSENSUS DECISIONS</div>
              </div>
              <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                {consensusDecisions.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-white/20 font-mono">
                    No consensus decisions yet
                  </div>
                )}
                {consensusDecisions.map((d: any, i: number) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-white">{d.pair}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        d.approved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>{d.approved ? 'APPROVED' : 'REJECTED'}</span>
                    </div>
                    <div className="text-[10px] text-white/30 font-mono">
                      Confidence: {((d.weighted_confidence || 0) * 100).toFixed(0)}%
                      {d.vetoed && <span className="text-red-400 ml-2">VETOED</span>}
                    </div>
                    {/* Vote grid */}
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      {['technical', 'sentiment', 'risk', 'llm'].map(agent => {
                        const vote = (d.votes || []).find((v: any) => v.agent === agent);
                        return (
                          <div key={agent} className="text-center">
                            <div className="text-[8px] text-white/20 font-mono uppercase">{agent.slice(0, 4)}</div>
                            <div className={`text-[10px] font-mono font-bold ${
                              vote?.confidence > 0.6 ? 'text-emerald-400' : vote?.confidence > 0.4 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {vote ? `${(vote.confidence * 100).toFixed(0)}%` : '--'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Multi-Exchange Panel */}
            <div className="border border-orange-500/20 rounded-lg bg-[#0a0a0a]">
              <div className="px-4 py-3 border-b border-white/5">
                <div className="text-[10px] text-orange-400/60 font-mono">CONNECTED EXCHANGES ({connectedExchanges.length})</div>
              </div>
              <div className="divide-y divide-white/5">
                {connectedExchanges.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-white/20 font-mono">
                    No exchanges connected
                  </div>
                )}
                {connectedExchanges.map((ex: string) => {
                  const marketCount = (config.markets || []).filter(m => m.enabled && m.exchange === ex).length;
                  const posCount = positions.filter(p => p.exchange === ex).length;
                  return (
                    <div key={ex} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-bold text-white uppercase">{ex}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">ACTIVE</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-white/30">
                        <div>Markets: <span className="text-white/60">{marketCount}</span></div>
                        <div>Positions: <span className="text-white/60">{posCount}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Session Keys Panel */}
            <div className="border border-orange-500/20 rounded-lg bg-[#0a0a0a]">
              <div className="px-4 py-3 border-b border-white/5">
                <div className="text-[10px] text-orange-400/60 font-mono">SESSION KEYS ({sessionKeys.length})</div>
              </div>
              <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                {sessionKeys.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-white/20 font-mono">
                    No active session keys
                  </div>
                )}
                {sessionKeys.map((k: any, i: number) => {
                  const pctUsed = k.maxSpendUSD > 0 ? (k.spentUSD / k.maxSpendUSD) * 100 : 0;
                  const expiresIn = Math.max(0, k.expiresIn || 0);
                  const hoursLeft = Math.floor(expiresIn / 3600000);
                  const minsLeft = Math.floor((expiresIn % 3600000) / 60000);
                  return (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-bold text-white uppercase">{k.chain}</span>
                        <span className="text-[10px] font-mono text-white/30">{k.exchange}</span>
                      </div>
                      <div className="text-[10px] font-mono text-white/40 mb-1">
                        {k.publicAddress ? `${k.publicAddress.slice(0, 8)}...${k.publicAddress.slice(-6)}` : 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pctUsed > 80 ? 'bg-red-500' : pctUsed > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(pctUsed, 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-white/40">
                          ${k.spentUSD?.toFixed(0)}/${k.maxSpendUSD?.toFixed(0)}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-white/20">
                        Expires: {hoursLeft}h {minsLeft}m
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Errors Log */}
          {errors.length > 0 && (
            <div className="border border-red-500/20 rounded-lg bg-[#0a0a0a]">
              <div className="px-4 py-3 border-b border-white/5">
                <div className="text-[10px] text-red-400/60 font-mono">ERRORS ({errors.length})</div>
              </div>
              <div className="divide-y divide-white/5 max-h-40 overflow-y-auto">
                {errors.map((err, i) => (
                  <div key={i} className="px-4 py-2 flex items-start gap-3">
                    <span className="text-[10px] text-white/20 font-mono shrink-0">
                      {new Date(err.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] text-red-400/60 font-mono shrink-0">[{err.source}]</span>
                    <span className="text-xs text-red-400/80 font-mono">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function TradingAgentPage() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_AGENT_CONFIG);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('off');
  const [showDashboard, setShowDashboard] = useState(false);

  // Credentials collected from wizard (passed via ref to avoid re-renders)
  const credentialsRef = useRef<{
    hlApiKey: string;
    hlApiSecret: string;
    hlTestnet: boolean;
    solanaRpc: string;
    ethRpc: string;
    walletAddress: string | null;
  }>({
    hlApiKey: '',
    hlApiSecret: '',
    hlTestnet: true,
    solanaRpc: 'https://api.mainnet-beta.solana.com',
    ethRpc: 'https://eth.llamarpc.com',
    walletAddress: null,
  });

  const handleComplete = async (credentials: {
    hlApiKey: string;
    hlApiSecret: string;
    hlTestnet: boolean;
    solanaRpc: string;
    ethRpc: string;
    walletAddress: string | null;
  }) => {
    credentialsRef.current = credentials;
    setIsConfigured(true);
    setShowDashboard(true);
    setAgentStatus('active');
    try {
      await fetch('/api/agent/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          config: {
            testnet: credentials.hlTestnet,
            portfolioUSD: config.capitalAllocation.total,
            maxRiskPercent: config.riskLimits.maxDailyDrawdown * 100,
            enableTrading: !credentials.hlTestnet,
            markets: config.markets.filter(m => m.enabled).map(m => m.pair),
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
          },
        }),
      });
    } catch (err) {
      console.error('[Agent] Failed to start:', err);
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
      <h2 className="text-2xl font-bold text-orange-500 mb-3">HACKER YIELDS — YHP ACCESS</h2>
      <p className="text-[#e4e4e7]/50 text-sm text-center max-w-lg mb-2">
        AI Autonomous Trading Agent with multi-strategy execution, risk management, and real-time portfolio tracking.
      </p>
      <p className="text-[#e4e4e7]/40 text-xs text-center max-w-md mb-6">
        Connect your ETH wallet and verify Yield Hacker Pass ownership to unlock full access.
      </p>
      <div className="text-[10px] text-orange-500/40 font-mono">REQUIRED: YIELD HACKER PASS NFT</div>
    </div>
  );

  if (!isConfigured || !showDashboard) {
    return (
      <PremiumContent fallback={yhpFallback}>
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
    <PremiumContent fallback={yhpFallback}>
      <AgentDashboard
        config={config}
        agentStatus={agentStatus}
        setAgentStatus={setAgentStatus}
        onReconfigure={handleReconfigure}
      />
    </PremiumContent>
  );
}
