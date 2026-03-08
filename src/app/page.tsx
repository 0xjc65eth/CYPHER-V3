'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  TrendingUp, Shield, Zap, Brain, BarChart3, Globe,
  ArrowRight, ChevronDown, Check, Rocket, Crown, Star,
  Lock, Activity, Layers, Eye, Bot, Cpu
} from 'lucide-react'

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Bloomberg Terminal UI',
    desc: 'Professional-grade trading dashboard with real-time market data, candlestick charts, and institutional analytics.',
  },
  {
    icon: Brain,
    title: 'CYPHER AI Analytics',
    desc: '8-agent AI system analyzing markets 24/7. Sentiment, technical, and macro analysis powered by Grok and Gemini.',
  },
  {
    icon: Bot,
    title: 'Autonomous Trading Agent',
    desc: 'AI agent that trades for you on Hyperliquid, Jupiter, and Uniswap. Multi-agent consensus with risk veto power.',
  },
  {
    icon: Globe,
    title: 'Cross-Chain Swaps',
    desc: 'Swap BTC, ETH, SOL and 50+ tokens across chains via THORChain, Jupiter, and 1inch. No bridges needed.',
  },
  {
    icon: TrendingUp,
    title: 'Arbitrage Scanner',
    desc: 'Real-time price comparison across 8 exchanges. Triangular arbitrage paths and spread analytics.',
  },
  {
    icon: Shield,
    title: 'Risk Management',
    desc: 'MaxDrawdown protection, liquidation guard, MEV protection, and Kelly Criterion position sizing.',
  },
  {
    icon: Layers,
    title: 'Ordinals & Runes Terminal',
    desc: 'Professional Runes market data, BRC-20 analytics, rare sats scanner, and inscription tracking.',
  },
  {
    icon: Cpu,
    title: 'Neural Predictions',
    desc: 'LSTM neural network models for price prediction, sentiment analysis, and risk assessment. Runs in-browser.',
  },
]

const TIERS = [
  {
    name: 'Free',
    price: 0,
    accent: '#6B7280',
    desc: 'Explore the terminal',
    features: ['Dashboard (view-only)', 'Real-time market data', 'Basic portfolio view'],
    cta: 'Start Free',
    href: '/dashboard',
  },
  {
    name: 'Explorer',
    price: 29,
    accent: '#3B82F6',
    desc: 'Essential tools for Bitcoin traders',
    features: ['Everything in Free', 'Portfolio tracking', 'Cross-chain swaps', 'Ordinals & Runes viewer', 'Arbitrage scanner', 'AI analytics (CYPHER AI)', 'Unlimited alerts', 'Paper trading'],
    cta: 'Get Explorer',
    href: '/pricing',
  },
  {
    name: 'Trader',
    price: 79,
    accent: '#FF6B00',
    desc: 'Advanced tools for serious traders',
    features: ['Everything in Explorer', 'Neural predictions', 'Smart Money Concepts', 'Whale tracking'],
    cta: 'Get Trader',
    href: '/pricing',
  },
  {
    name: 'Hacker Yields',
    price: 149,
    accent: '#F7931A',
    desc: 'Full autonomous trading suite',
    popular: true,
    features: ['Everything in Trader', 'AI Trading Agent (auto-trade)', 'Multi-agent consensus', 'Auto-compound yields', 'MEV protection'],
    cta: 'Get Hacker Yields',
    href: '/pricing',
  },
]

const FAQS = [
  {
    q: 'What wallets do you support?',
    a: 'We support Bitcoin wallets (Xverse, UniSat, OYL, Gamma.io) and Ethereum wallets (MetaMask). Connect either to access the platform.',
  },
  {
    q: 'Is the AI Trading Agent safe?',
    a: 'Yes. Auto-trade is disabled by default and requires explicit opt-in. The system has multi-layered protection: max drawdown limits, liquidation guards, MEV protection, stop-loss orders on exchange, and a Risk Manager with veto power that can reject any trade.',
  },
  {
    q: 'How can I pay?',
    a: 'We accept Bitcoin on-chain and Lightning Network ⚡ via BTCPay Server. All payments are self-custodial with no KYC.',
  },
  {
    q: 'What exchanges does the agent trade on?',
    a: 'Hyperliquid (perpetuals), Jupiter/Raydium (Solana DEX), and Uniswap/1inch (EVM DEXs). All are NO-KYC decentralized exchanges.',
  },
  {
    q: 'Do I need to share my private keys?',
    a: 'For viewing/analytics features, no. For autonomous trading, you provide keys through an encrypted setup wizard. Keys are encrypted with AES-256-GCM and never leave your session.',
  },
  {
    q: 'What is the YHP (Yield Hacker Pass)?',
    a: 'An NFT that grants lifetime Elite access. Holders get 0% platform fees and full access to all features without a subscription.',
  },
]

const STATS = [
  { value: '8+', label: 'Exchanges Monitored' },
  { value: '50+', label: 'Tokens Supported' },
  { value: '24/7', label: 'AI Analysis' },
  { value: '<5s', label: 'Trade Execution' },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-mono text-white/90">{q}</span>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-white/50 font-mono leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
            <Activity className="w-3 h-3 text-orange-400" />
            <span className="text-xs font-mono text-orange-400">Live on Mainnet</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-mono leading-tight mb-6">
            Trade Bitcoin Like a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
              Bloomberg Terminal
            </span>
          </h1>

          <p className="text-lg text-white/50 font-mono max-w-2xl mx-auto mb-10">
            Professional trading dashboard with AI-powered analytics, autonomous trading agent,
            cross-chain swaps, and real-time arbitrage scanning. No KYC required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-black font-mono font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              Launch Terminal <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3 border border-white/20 text-white font-mono font-medium rounded-lg hover:bg-white/5 transition-colors"
            >
              View Plans
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold font-mono text-orange-400">{s.value}</div>
                <div className="text-xs text-white/40 font-mono mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Terminal Preview */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="relative rounded-xl border border-white/10 bg-[#0d0d1a] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-black/50 border-b border-white/10">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="ml-2 text-xs font-mono text-white/30">CYPHER ORDI FUTURE v3 — Professional Trading Terminal</span>
          </div>
          <div className="p-6 space-y-3">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {['BTC $97,432', 'ETH $3,841', 'SOL $187', 'DOGE $0.32', 'RUNE $5.21', 'STX $2.18'].map((t) => (
                <div key={t} className="bg-black/40 rounded-lg p-3 text-center border border-white/5">
                  <div className="text-[10px] text-white/30 font-mono">{t.split(' ')[0]}</div>
                  <div className="text-sm font-mono text-green-400">{t.split(' ')[1]}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-black/40 rounded-lg p-4 border border-white/5 sm:col-span-2">
                <div className="text-[10px] text-white/30 font-mono mb-2">BTC/USD — 4H Chart</div>
                <div className="flex items-end gap-px h-20">
                  {[40,45,42,48,52,50,55,60,58,62,65,60,63,68,72,70,75,78,74,80,82,78,85,88,90,87,92,95,93,97].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: h > (i > 0 ? [40,45,42,48,52,50,55,60,58,62,65,60,63,68,72,70,75,78,74,80,82,78,85,88,90,87,92,95,93,97][i-1] : 40) ? '#22c55e' : '#ef4444', opacity: 0.6 }} />
                  ))}
                </div>
              </div>
              <div className="bg-black/40 rounded-lg p-4 border border-white/5 space-y-2">
                <div className="text-[10px] text-white/30 font-mono">AI Signals</div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-green-400">BTC LONG</span>
                  <span className="text-white/30 ml-auto">87%</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-red-400">ETH SHORT</span>
                  <span className="text-white/30 ml-auto">72%</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-green-400">SOL LONG</span>
                  <span className="text-white/30 ml-auto">65%</span>
                </div>
                <div className="text-[10px] text-white/20 font-mono mt-2">Consensus: 4/4 agents</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-mono mb-3">
            Everything You Need to{' '}
            <span className="text-orange-400">Trade Smarter</span>
          </h2>
          <p className="text-sm text-white/40 font-mono max-w-lg mx-auto">
            Professional tools used by institutional traders, now accessible to everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-[#0d0d1a] border border-white/5 rounded-xl p-5 hover:border-orange-500/20 transition-colors group">
              <f.icon className="w-8 h-8 text-orange-400/60 mb-3 group-hover:text-orange-400 transition-colors" />
              <h3 className="text-sm font-bold font-mono text-white mb-1.5">{f.title}</h3>
              <p className="text-xs text-white/40 font-mono leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-mono mb-3">
            Start Trading in{' '}
            <span className="text-orange-400">3 Steps</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: '01', icon: Lock, title: 'Connect Wallet', desc: 'Connect your Bitcoin or Ethereum wallet. No signup, no KYC. Your keys, your crypto.' },
            { step: '02', icon: Eye, title: 'Explore & Analyze', desc: 'Access real-time market data, AI analytics, arbitrage scanner, and portfolio tracking for free.' },
            { step: '03', icon: Rocket, title: 'Upgrade & Automate', desc: 'Subscribe to unlock autonomous trading, CYPHER AI, and advanced strategies.' },
          ].map((s) => (
            <div key={s.step} className="relative bg-[#0d0d1a] border border-white/5 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold font-mono text-white/5 absolute top-3 right-4">{s.step}</div>
              <s.icon className="w-10 h-10 text-orange-400/60 mx-auto mb-4" />
              <h3 className="text-sm font-bold font-mono text-white mb-2">{s.title}</h3>
              <p className="text-xs text-white/40 font-mono leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-4 pb-20" id="pricing">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-mono mb-3">
            <span className="text-white">Simple</span>{' '}
            <span className="text-orange-400">Pricing</span>
          </h2>
          <p className="text-sm text-white/40 font-mono">
            Start free. Upgrade when you need more power. All paid plans include a 7-day free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col bg-[#0d0d1a] border rounded-xl p-5 transition-all ${
                tier.popular
                  ? 'border-[#8B5CF6]/40 shadow-[0_0_30px_rgba(139,92,246,0.08)]'
                  : 'border-white/5 hover:border-white/10'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-[#8B5CF6] text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> Most Popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold font-mono" style={{ color: tier.accent }}>{tier.name}</h3>
                <p className="text-[10px] text-white/30 font-mono">{tier.desc}</p>
              </div>

              <div className="mb-5">
                {tier.price === 0 ? (
                  <span className="text-3xl font-bold font-mono text-white/60">Free</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold font-mono" style={{ color: tier.accent }}>${tier.price}</span>
                    <span className="text-sm text-white/30 font-mono">/mo</span>
                  </>
                )}
              </div>

              <ul className="flex-1 space-y-2 mb-5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: tier.accent }} />
                    <span className="text-xs text-white/50 font-mono">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className="block w-full py-2.5 text-center text-sm font-mono font-bold rounded-lg transition-all hover:opacity-90"
                style={{
                  backgroundColor: tier.popular ? tier.accent : 'transparent',
                  color: tier.popular ? '#000' : tier.accent,
                  border: tier.popular ? 'none' : `1px solid ${tier.accent}40`,
                }}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] text-white/20 font-mono mt-6">
          Or hold a Yield Hacker Pass (YHP) NFT for lifetime access with 0% fees.
        </p>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold font-mono">
            Frequently Asked{' '}
            <span className="text-orange-400">Questions</span>
          </h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold font-mono mb-4">
            Ready to Trade Like a Pro?
          </h2>
          <p className="text-sm text-white/50 font-mono mb-8 max-w-lg mx-auto">
            Connect your wallet and start using CYPHER for free. No signup needed.
            Upgrade anytime to unlock AI trading and advanced features.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-black font-mono font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              Launch Terminal <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3 border border-orange-500/30 text-orange-400 font-mono font-medium rounded-lg hover:bg-orange-500/5 transition-colors"
            >
              Compare Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-white/30 font-mono">
              CYPHER ORDI FUTURE v3 — Professional Bitcoin Trading Intelligence
            </div>
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/60 font-mono">Terminal</Link>
              <Link href="/pricing" className="text-xs text-white/30 hover:text-white/60 font-mono">Pricing</Link>
              <Link href="/whitepaper" className="text-xs text-white/30 hover:text-white/60 font-mono">Whitepaper</Link>
              <Link href="/bug-report" className="text-xs text-white/30 hover:text-white/60 font-mono">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
