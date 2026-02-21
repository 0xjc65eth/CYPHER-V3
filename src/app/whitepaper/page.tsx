'use client'

import { useWhitepaper } from '@/contexts/WhitepaperContext'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'

export default function WhitepaperPage() {
  const { hasAccepted, acceptWhitepaper } = useWhitepaper()
  const router = useRouter()
  const [scrolledToBottom, setScrolledToBottom] = useState(false)
  const [activeSection, setActiveSection] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hasAccepted) {
      router.replace('/')
    }
  }, [hasAccepted, router])

  const handleScroll = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    const threshold = 100
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    if (atBottom) setScrolledToBottom(true)

    // Track active section
    const sections = el.querySelectorAll('[data-section]')
    let current = 0
    sections.forEach((section, i) => {
      const rect = section.getBoundingClientRect()
      const containerRect = el.getBoundingClientRect()
      if (rect.top - containerRect.top < containerRect.height * 0.4) {
        current = i
      }
    })
    setActiveSection(current)
  }, [])

  const handleAccept = () => {
    acceptWhitepaper()
    router.replace('/')
  }

  const sections = [
    'Abstract',
    'Problem Statement',
    'Provenance',
    'Terminal',
    'Sat Accumulation',
    'CYPHER AI',
    'Treasury',
    'Fee Model',
    'Architecture',
    'Security',
    'Roadmap',
    'Commitment',
  ]

  const scrollToSection = (index: number) => {
    const el = contentRef.current
    if (!el) return
    const target = el.querySelectorAll('[data-section]')[index]
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (hasAccepted) return null

  return (
    <div className="min-h-screen bg-black text-gray-300 font-mono flex flex-col">
      {/* Header */}
      <header className="border-b border-[#F7931A]/30 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F7931A] animate-pulse" />
              <span className="text-[#F7931A] font-bold text-lg tracking-widest">CYPHER</span>
            </div>
            <div className="hidden sm:block text-gray-600 text-xs">|</div>
            <span className="hidden sm:block text-gray-500 text-xs tracking-wider">WHITEPAPER v2.0</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-[10px] tracking-wider hidden md:block">FEB 2026</span>
            <div className="h-4 w-px bg-gray-800 hidden md:block" />
            <span className="text-gray-600 text-[10px] tracking-wider hidden md:block">0xcypher65</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Sidebar Navigation */}
        <nav className="hidden lg:flex flex-col w-56 border-r border-gray-800/50 py-6 px-3 sticky top-[53px] h-[calc(100vh-53px)] overflow-y-auto">
          <div className="text-[10px] text-gray-600 tracking-widest mb-4 px-2">TABLE OF CONTENTS</div>
          {sections.map((s, i) => (
            <button
              key={i}
              onClick={() => scrollToSection(i)}
              className={`text-left text-xs px-2 py-1.5 rounded transition-all duration-200 mb-0.5 ${
                activeSection === i
                  ? 'text-[#F7931A] bg-[#F7931A]/5'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'
              }`}
            >
              <span className="text-gray-700 mr-2">{String(i).padStart(2, '0')}</span>
              {s}
            </button>
          ))}
          <div className="mt-auto pt-6 border-t border-gray-800/50 mt-6">
            <div className="text-[10px] text-gray-700 px-2">
              PROVENANCE IS PROOF
              <br />
              SATS ARE SOVEREIGNTY
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto h-[calc(100vh-53px-72px)] px-4 sm:px-8 lg:px-12 py-8"
        >
          {/* Hero */}
          <div data-section className="mb-16">
            <pre className="text-[#F7931A] text-[8px] sm:text-[10px] leading-tight mb-6 overflow-x-auto select-none">
{` ██████╗██╗   ██╗██████╗ ██╗  ██╗███████╗██████╗
██╔════╝╚██╗ ██╔╝██╔══██╗██║  ██║██╔════╝██╔══██╗
██║      ╚████╔╝ ██████╔╝███████║█████╗  ██████╔╝
██║       ╚██╔╝  ██╔═══╝ ██╔══██║██╔══╝  ██╔══██╗
╚██████╗   ██║   ██║     ██║  ██║███████╗██║  ██║
 ╚═════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝`}
            </pre>
            <div className="text-[#F7931A]/60 text-[10px] tracking-[0.3em] mb-8">
              PROVENANCE IS PROOF. SATS ARE SOVEREIGNTY.
            </div>

            <blockquote className="border-l-2 border-[#F7931A]/30 pl-4 mb-8 italic text-gray-500 text-sm leading-relaxed">
              &ldquo;Privacy is necessary for an open society in the electronic age. Privacy is not secrecy.
              A private matter is something one doesn&rsquo;t want the whole world to know, but a secret matter
              is something one doesn&rsquo;t want anybody to know. Privacy is the power to selectively reveal
              oneself to the world.&rdquo;
              <div className="mt-2 text-[10px] text-gray-600 not-italic tracking-wider">
                &mdash; ERIC HUGHES, A CYPHERPUNK&apos;S MANIFESTO, 1993
              </div>
            </blockquote>

            <div className="bg-gray-900/30 border border-gray-800/50 rounded p-6 mb-8">
              <h2 className="text-[#F7931A] text-sm font-bold tracking-wider mb-4">ABSTRACT</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                CYPHER is a non-custodial, permissionless trading terminal engineered for Bitcoin-native
                digital assets — Ordinals, Runes, BRC-20, and Rare Sats — with cross-chain execution
                capabilities spanning 9 blockchain networks.
              </p>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                The protocol introduces three foundational primitives to the Bitcoin asset ecosystem:
              </p>
              <div className="space-y-3 mb-4">
                <div className="flex gap-3">
                  <span className="text-[#F7931A] text-xs mt-0.5">01</span>
                  <div>
                    <span className="text-gray-300 text-sm font-bold">Provenance Verification</span>
                    <span className="text-gray-500 text-sm"> — Cryptographic chain-of-custody tracking from inscription genesis to current holder, eliminating counterfeit risk at the infrastructure layer.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#F7931A] text-xs mt-0.5">02</span>
                  <div>
                    <span className="text-gray-300 text-sm font-bold">Market Unification</span>
                    <span className="text-gray-500 text-sm"> — Real-time aggregation of fragmented liquidity across Magic Eden, UniSat, OKX, and Hiro into a single Bloomberg Terminal-grade interface.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#F7931A] text-xs mt-0.5">03</span>
                  <div>
                    <span className="text-gray-300 text-sm font-bold">Cultural Preservation Treasury</span>
                    <span className="text-gray-500 text-sm"> — A protocol-funded, multi-sig vault that allocates 70% of net revenue to the permanent acquisition of foundational Bitcoin collections.</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-xs tracking-wider">
                NO TOKEN SALE. NO VENTURE CAPITAL. NO KYC. THE CODE IS THE PRODUCT. THE CHAIN IS THE RECEIPT.
              </p>
            </div>
          </div>

          {/* Section 1: Problem Statement */}
          <section data-section className="mb-16">
            <SectionHeader num="01" title="PROBLEM STATEMENT" />
            <div className="space-y-6">
              <Subsection title="1.1 Market Fragmentation">
                <p>
                  The current ecosystem forces participants to maintain parallel sessions across isolated platforms.
                  Runes market data lives on Hiro. Ordinals listings surface on Magic Eden. Floor price discovery
                  requires UniSat. EVM portfolio tracking depends on DeBank. Mempool analysis demands mempool.space.
                  Chart analysis requires TradingView.
                </p>
                <p>
                  The result: 14 open tabs, fragmented context, and incomplete information. This is not a user
                  experience problem — it is an <span className="text-[#F7931A]">information asymmetry problem</span> that costs traders money.
                </p>
              </Subsection>

              <Subsection title="1.2 Interface Inadequacy">
                <p>
                  Traditional finance operates on Bloomberg Terminal — a $24,000/year subscription that persists
                  because information density creates alpha. The cryptocurrency ecosystem instead produces
                  consumer-grade dashboards optimized for visual appeal over data completeness.
                </p>
                <p>
                  Professional traders need information density. Every pixel that displays decoration instead of
                  data is a pixel wasted.
                </p>
              </Subsection>

              <Subsection title="1.3 Provenance Opacity">
                <p>
                  The fundamental question of digital asset ownership — <em>&ldquo;Can you verify the complete chain
                  of custody?&rdquo;</em> — remains unanswerable on most platforms. Buyers cannot confirm which satoshi
                  carries an inscription, cannot trace every wallet in the ownership history, and cannot verify
                  whether a minting address belongs to the original creator or a copycat.
                </p>
                <p>
                  Trading without provenance verification is trading on faith. <span className="text-[#F7931A]">Faith is not a cypherpunk value.</span>
                </p>
              </Subsection>

              <Subsection title="1.4 Absence of Sat-Stacking Infrastructure">
                <p>
                  Arbitrage opportunities between Runes marketplaces exist. Cross-chain pricing inefficiencies are
                  measurable. Superior routing algorithms are available. Yet no single platform identifies these
                  opportunities, quantifies them, and provides execution — in one interface.
                </p>
                <HighlightBox>CYPHER addresses all four failures.</HighlightBox>
              </Subsection>
            </div>
          </section>

          {/* Section 2: Provenance */}
          <section data-section className="mb-16">
            <SectionHeader num="02" title="PROVENANCE AS INFRASTRUCTURE" />
            <div className="space-y-6">
              <Subsection title="2.1 The Thesis">
                <p>
                  In an epoch of generative AI, infinite digital reproduction, and synthetic media —
                  <span className="text-[#F7931A] font-bold"> provenance is the singular property that distinguishes an original from a copy.</span>
                </p>
                <p>Bitcoin provides the strongest provenance substrate ever constructed:</p>
                <ul className="space-y-2 mt-3">
                  <li className="flex gap-2">
                    <span className="text-[#F7931A]">&gt;</span>
                    <span><strong className="text-gray-300">Proof-of-work timestamps</strong> are anchored to irreversible energy expenditure. No alternative consensus mechanism achieves equivalent immutability.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#F7931A]">&gt;</span>
                    <span><strong className="text-gray-300">The UTXO model</strong> creates an unbroken, auditable chain of custody for every satoshi from coinbase reward to current holder.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#F7931A]">&gt;</span>
                    <span><strong className="text-gray-300">Inscription data</strong> is immutable post-confirmation. No admin key, no proxy upgrade, no governance vote can alter it.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#F7931A]">&gt;</span>
                    <span><strong className="text-gray-300">Zero smart contract surface area</strong> means no reentrancy, no proxy manipulation, no ruggable metadata.</span>
                  </li>
                </ul>
              </Subsection>

              <Subsection title="2.2 CYPHER's Implementation">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FeatureCard title="Inscription Chain of Custody" description="Complete ownership history from minting transaction to current holder. Every intermediate wallet. Every transfer timestamp." />
                  <FeatureCard title="Sat-Level Classification" description="Rarity tiers (common to mythic) and origin tracking — halving blocks, difficulty adjustments, early coinbase rewards." />
                  <FeatureCard title="Collection Authentication" description="Inscription trace verification to authenticated minting addresses. Counterfeits programmatically flagged and excluded." />
                  <FeatureCard title="Runes Etching Provenance" description="Protocol-native tracking from etching block through every mint and transfer. No indexer trust assumptions." />
                </div>
                <HighlightBox>If your platform cannot verify provenance, it is not a tool — it is a liability.</HighlightBox>
              </Subsection>
            </div>
          </section>

          {/* Section 3: Terminal */}
          <section data-section className="mb-16">
            <SectionHeader num="03" title="TERMINAL ARCHITECTURE" />
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-3 mb-6">
                <div className="border border-gray-800/50 rounded p-4 bg-gray-900/20">
                  <div className="text-[#F7931A] text-[10px] tracking-wider mb-2">PRINCIPLE 01</div>
                  <div className="text-gray-300 text-sm font-bold mb-1">Density over decoration</div>
                  <div className="text-gray-500 text-xs">Every pixel renders data. Orange on black.</div>
                </div>
                <div className="border border-gray-800/50 rounded p-4 bg-gray-900/20">
                  <div className="text-[#F7931A] text-[10px] tracking-wider mb-2">PRINCIPLE 02</div>
                  <div className="text-gray-300 text-sm font-bold mb-1">Real-time or nothing</div>
                  <div className="text-gray-500 text-xs">WebSocket feeds. 5-second staleness threshold.</div>
                </div>
                <div className="border border-gray-800/50 rounded p-4 bg-gray-900/20">
                  <div className="text-[#F7931A] text-[10px] tracking-wider mb-2">PRINCIPLE 03</div>
                  <div className="text-gray-300 text-sm font-bold mb-1">Single-context operation</div>
                  <div className="text-gray-500 text-xs">All modules in one terminal session.</div>
                </div>
              </div>

              <Subsection title="Terminal Modules">
                <div className="space-y-2">
                  <ModuleRow name="Market Dashboard" desc="Real-time pricing (100+ assets), hashrate, mempool fees, Fear & Greed, Lightning capacity" />
                  <ModuleRow name="Runes Terminal" desc="Hiro + UniSat + OKX aggregation. TradingView charts. Sortable tables. Arbitrage scanner." />
                  <ModuleRow name="Ordinals Explorer" desc="Inscription browser with provenance chain. Rarity classification. Multi-marketplace floors." />
                  <ModuleRow name="Rare Sats" desc="Discovery by rarity class, origin block, halving epoch, special properties." />
                  <ModuleRow name="Portfolio" desc="9-chain view: BTC, ETH, SOL, MATIC, ARB, OP, BASE, AVAX, BSC. Sats + USD P&L." />
                  <ModuleRow name="Trading Engine" desc="Multi-DEX routing: 1inch, Paraswap, Jupiter, Uniswap, THORChain. Cross-chain swaps." />
                  <ModuleRow name="Arbitrage Scanner" desc="Cross-marketplace price discrepancy detection. Net profit after fees." />
                  <ModuleRow name="CYPHER AI" desc="Neural analysis, trading signals, sentiment scoring, PT-BR voice interface." />
                </div>
              </Subsection>

              <Subsection title="Wallet Integration">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <WalletCard name="Xverse" chain="Bitcoin" assets="BTC, Ordinals, Runes, BRC-20" />
                  <WalletCard name="UniSat" chain="Bitcoin" assets="BTC, Ordinals, Runes, BRC-20" />
                  <WalletCard name="LaserEyes" chain="Bitcoin" assets="BTC native" />
                  <WalletCard name="MetaMask" chain="EVM" assets="ETH, ERC-20, L2 tokens" />
                  <WalletCard name="Phantom" chain="Solana" assets="SOL, SPL tokens" />
                  <WalletCard name="WalletConnect" chain="Multi" assets="Universal EVM" />
                </div>
                <div className="mt-4 text-[10px] text-gray-600 tracking-wider">
                  NON-CUSTODIAL ARCHITECTURE. ZERO ACCESS TO PRIVATE KEYS. ALL TRANSACTIONS SIGNED CLIENT-SIDE.
                </div>
              </Subsection>
            </div>
          </section>

          {/* Section 4: Sat Accumulation */}
          <section data-section className="mb-16">
            <SectionHeader num="04" title="SAT ACCUMULATION ENGINE" />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border border-gray-800/50 rounded p-5 bg-gray-900/20">
                  <div className="text-[#F7931A] text-xs font-bold mb-2">CROSS-MARKETPLACE ARBITRAGE</div>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Real-time price differential monitoring across Runes and Ordinals marketplaces. Spread visualization,
                    net profit computation after fees, and single-interface execution of both legs.
                  </p>
                </div>
                <div className="border border-gray-800/50 rounded p-5 bg-gray-900/20">
                  <div className="text-[#F7931A] text-xs font-bold mb-2">OPTIMAL PRICE ROUTING</div>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Simultaneous queries across 1inch, Paraswap, Jupiter, Uniswap, and THORChain. Best available rate
                    selected automatically. Superior routing = more sats per trade.
                  </p>
                </div>
                <div className="border border-gray-800/50 rounded p-5 bg-gray-900/20">
                  <div className="text-[#F7931A] text-xs font-bold mb-2">NATIVE CROSS-CHAIN</div>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    THORChain routing for native cross-chain swaps — ETH&rarr;BTC, SOL&rarr;BTC. No wrapped tokens.
                    No bridge intermediaries. No synthetic assets.
                  </p>
                </div>
                <div className="border border-gray-800/50 rounded p-5 bg-gray-900/20">
                  <div className="text-[#F7931A] text-xs font-bold mb-2">YHP ZERO-FEE ACCESS</div>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Your Holder Pass eliminates all protocol fees. Every basis point preserved compounds into the stack.
                    On-chain verification.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: CYPHER AI */}
          <section data-section className="mb-16">
            <SectionHeader num="05" title="CYPHER AI — INTELLIGENCE LAYER" />
            <div className="space-y-6">
              <p className="text-gray-500 text-sm">Not a chatbot. A multi-modal intelligence layer purpose-built for Bitcoin-native market analysis.</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <FeatureCard title="Real-Time Sentiment" description="Aggregated signals from Twitter/X, crypto news, and on-chain whale movements. Directional scoring via WebSocket." />
                <FeatureCard title="On-Device Neural Prediction" description="TensorFlow.js models running locally. Short-term forecasting with confidence intervals. Accuracy tracked and displayed." />
                <FeatureCard title="Smart Money Concepts" description="Automated institutional analysis: order blocks, fair value gaps, liquidity sweeps, break of structure." />
                <FeatureCard title="PT-BR Voice Interface" description="ElevenLabs neural voice synthesis. Context-adaptive tone. Speech-to-text for hands-free operation." />
              </div>

              <div className="bg-gray-900/40 border border-[#F7931A]/20 rounded p-4 font-mono text-xs">
                <div className="text-gray-600 mb-2">// SIGNAL OUTPUT FORMAT</div>
                <div className="space-y-1">
                  <div><span className="text-gray-500">SIGNAL:</span>      <span className="text-green-400">BUY</span></div>
                  <div><span className="text-gray-500">ASSET:</span>       <span className="text-[#F7931A]">BTC</span></div>
                  <div><span className="text-gray-500">CONFIDENCE:</span>  <span className="text-gray-300">0.82</span></div>
                  <div><span className="text-gray-500">ENTRY:</span>       <span className="text-gray-300">$97,400</span></div>
                  <div><span className="text-gray-500">TARGET:</span>      <span className="text-green-400">$103,200</span></div>
                  <div><span className="text-gray-500">STOP-LOSS:</span>   <span className="text-red-400">$94,800</span></div>
                  <div><span className="text-gray-500">SOURCE:</span>      <span className="text-gray-400">neural + smc</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Treasury */}
          <section data-section className="mb-16">
            <SectionHeader num="06" title="TREASURY PROTOCOL — THE BUYBACK VAULT" />
            <div className="space-y-6">
              <blockquote className="border-l-2 border-[#F7931A]/30 pl-4 italic text-gray-500 text-sm">
                &ldquo;If we don&rsquo;t preserve the collections that defined Bitcoin culture, no one will.&rdquo;
              </blockquote>

              <div className="flex gap-4 sm:gap-8">
                <div className="flex-1 border border-[#F7931A]/30 rounded p-5 bg-[#F7931A]/5 text-center">
                  <div className="text-[#F7931A] text-3xl font-bold">70%</div>
                  <div className="text-gray-400 text-xs mt-1">TREASURY VAULT</div>
                  <div className="text-gray-600 text-[10px] mt-1">Permanent Acquisitions</div>
                </div>
                <div className="flex-1 border border-gray-800/50 rounded p-5 bg-gray-900/20 text-center">
                  <div className="text-gray-300 text-3xl font-bold">30%</div>
                  <div className="text-gray-400 text-xs mt-1">OPERATIONS</div>
                  <div className="text-gray-600 text-[10px] mt-1">Infrastructure + Dev</div>
                </div>
              </div>

              <Subsection title="Tier 1 — Foundational Collections">
                <div className="space-y-2">
                  <CollectionRow name="Aeons" desc="Genesis-era generative art on Bitcoin. Home of Aeon #1938 — 0xcypher65." />
                  <CollectionRow name="Bitcoin Puppets" desc="Community catalyst. Proved Ordinals culture could be irreverent and valuable." />
                  <CollectionRow name="NodeMonkes" desc="First 10K PFP on Bitcoin. Historical inflection point." />
                  <CollectionRow name="Quantum Cats" desc="Taproot Wizards. Expanded protocol technical boundaries." />
                  <CollectionRow name="OMB" desc="Ordinal Maxi Biz. The OGs who committed before market validation." />
                </div>
              </Subsection>

              <Subsection title="Tier 2 — Digital Antiquities">
                <div className="space-y-2">
                  <CollectionRow name="Sub-1K Inscriptions" desc="The first 1,000 inscriptions. Protocol genesis artifacts." />
                  <CollectionRow name="Rare Satoshis" desc="Special sats from halving blocks, difficulty adjustments, early coinbase rewards." />
                  <CollectionRow name="Cursed Inscriptions" desc="Protocol edge cases that achieved artifact status." />
                </div>
              </Subsection>

              <Subsection title="Trust Architecture">
                <div className="bg-gray-900/30 border border-gray-800/50 rounded p-4 text-xs text-gray-500 space-y-2">
                  <div className="text-gray-400 text-[10px] tracking-wider mb-3">&ldquo;DON&apos;T TRUST 0XCYPHER65. VERIFY THE TREASURY.&rdquo;</div>
                  <div className="flex gap-2"><span className="text-[#F7931A]">&gt;</span> 2-of-3 multi-sig authorization</div>
                  <div className="flex gap-2"><span className="text-[#F7931A]">&gt;</span> Public wallet addresses — on-chain verifiable</div>
                  <div className="flex gap-2"><span className="text-[#F7931A]">&gt;</span> Monthly published reports — community auditable</div>
                  <div className="flex gap-2"><span className="text-[#F7931A]">&gt;</span> No liquidation provision — bought = held forever</div>
                </div>
              </Subsection>

              <Subsection title="Treasury Addresses">
                <div className="space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                    <span className="text-[#F7931A] w-20 shrink-0">BTC</span>
                    <code className="text-gray-500 break-all">bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</code>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                    <span className="text-[#F7931A] w-20 shrink-0">ETH</span>
                    <code className="text-gray-500 break-all">0x476F803fEA41CC6DfbCb3F4Ba6bAF462c1AD32AB</code>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                    <span className="text-[#F7931A] w-20 shrink-0">SOL</span>
                    <code className="text-gray-500 break-all">EPbE1ZmLXkEJDitNb9KNu9Hq8mThS3P7LpBxdF3EkUwT</code>
                  </div>
                </div>
              </Subsection>
            </div>
          </section>

          {/* Section 7: Fee Model */}
          <section data-section className="mb-16">
            <SectionHeader num="07" title="FEE STRUCTURE & REVENUE MODEL" />
            <div className="space-y-6">
              <p className="text-gray-600 text-[10px] tracking-widest">TRANSPARENT. PROTOCOL-NATIVE. VERIFIABLE ON-CHAIN. NO HIDDEN CHARGES.</p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-[10px] text-gray-500 tracking-wider py-2 pr-4">PROTOCOL</th>
                      <th className="text-right text-[10px] text-gray-500 tracking-wider py-2 pr-4">FEE</th>
                      <th className="text-left text-[10px] text-gray-500 tracking-wider py-2">MECHANISM</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-400">
                    <tr className="border-b border-gray-800/30">
                      <td className="py-2 pr-4 text-gray-300">THORChain</td>
                      <td className="py-2 pr-4 text-right text-[#F7931A]">50 bps</td>
                      <td className="py-2 text-gray-500">Affiliate fee — protocol-deducted</td>
                    </tr>
                    <tr className="border-b border-gray-800/30">
                      <td className="py-2 pr-4 text-gray-300">Jupiter</td>
                      <td className="py-2 pr-4 text-right text-[#F7931A]">35 bps</td>
                      <td className="py-2 text-gray-500">platformFeeBps — Jupiter-deducted</td>
                    </tr>
                    <tr className="border-b border-gray-800/30">
                      <td className="py-2 pr-4 text-gray-300">1inch</td>
                      <td className="py-2 pr-4 text-right text-[#F7931A]">30 bps</td>
                      <td className="py-2 text-gray-500">Referrer fee — 1inch-deducted</td>
                    </tr>
                    <tr className="border-b border-gray-800/30">
                      <td className="py-2 pr-4 text-gray-300">Paraswap</td>
                      <td className="py-2 pr-4 text-right text-[#F7931A]">30 bps</td>
                      <td className="py-2 text-gray-500">Partner fee — Paraswap-deducted</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-gray-300">Magic Eden</td>
                      <td className="py-2 pr-4 text-right text-[#F7931A]">35 bps</td>
                      <td className="py-2 text-gray-500">PSBT fee output — BTC tx native</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4 text-xs">
                <div className="border border-gray-800/50 rounded px-4 py-2 bg-gray-900/20">
                  <span className="text-gray-500">MAX </span><span className="text-gray-300">$100</span>
                </div>
                <div className="border border-gray-800/50 rounded px-4 py-2 bg-gray-900/20">
                  <span className="text-gray-500">MIN </span><span className="text-gray-300">$0.01</span>
                </div>
                <div className="border border-[#F7931A]/30 rounded px-4 py-2 bg-[#F7931A]/5">
                  <span className="text-gray-500">YHP </span><span className="text-[#F7931A]">0%</span>
                </div>
              </div>

              <HighlightBox>
                Fees collected natively by each protocol. CYPHER never holds, touches, or intermediates funds.
                Verify fee wallet transactions against the published schedule.
              </HighlightBox>
            </div>
          </section>

          {/* Section 8: Architecture */}
          <section data-section className="mb-16">
            <SectionHeader num="08" title="TECHNICAL ARCHITECTURE" />
            <div className="space-y-6">
              <p className="text-gray-600 text-[10px] tracking-widest mb-4">FOR BUILDERS AND AUDITORS</p>

              <div className="grid gap-2 sm:grid-cols-2">
                <StackRow label="Application" value="Next.js 15, React 18, TypeScript 5" />
                <StackRow label="State" value="Zustand + React Query 5" />
                <StackRow label="Charts" value="TradingView Lightweight + ApexCharts" />
                <StackRow label="Database" value="Supabase (PostgreSQL) + fallback" />
                <StackRow label="Cache" value="Redis (ioredis) + SimpleCache" />
                <StackRow label="Real-Time" value="WebSocket server (port 8080)" />
                <StackRow label="AI/ML" value="TensorFlow.js + OpenAI + ElevenLabs" />
                <StackRow label="Blockchain" value="ethers.js, viem, @solana/web3.js" />
                <StackRow label="Monitoring" value="Prometheus + Grafana" />
                <StackRow label="Deploy" value="Docker Compose (6 containers)" />
              </div>

              <div className="bg-gray-900/30 border border-gray-800/50 rounded p-4">
                <div className="text-[10px] text-gray-500 tracking-wider mb-3">RESILIENCE MODEL</div>
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex gap-2"><span className="text-green-500">&#9679;</span> Database outage &rarr; in-memory fallback, terminal operational</div>
                  <div className="flex gap-2"><span className="text-green-500">&#9679;</span> Cache outage &rarr; SimpleCache fallback, same principle</div>
                  <div className="flex gap-2"><span className="text-green-500">&#9679;</span> API provider down &rarr; alternative sources cover</div>
                  <div className="flex gap-2"><span className="text-green-500">&#9679;</span> Job duplication &rarr; Redis locks prevent double execution</div>
                </div>
              </div>

              <div className="text-center text-gray-600 text-xs">
                70+ domain-scoped services. Each independently testable and failure-isolated.
              </div>
            </div>
          </section>

          {/* Section 9: Security */}
          <section data-section className="mb-16">
            <SectionHeader num="09" title="SECURITY MODEL" />
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border border-gray-800/50 rounded p-4 bg-gray-900/20">
                  <div className="text-green-500 text-[10px] tracking-wider mb-2">GUARANTEES</div>
                  <div className="space-y-1.5 text-xs text-gray-500">
                    <div>&gt; Non-custodial — zero key access</div>
                    <div>&gt; Client-side tx construction</div>
                    <div>&gt; Per-endpoint rate limiting</div>
                    <div>&gt; Zod input validation</div>
                    <div>&gt; 2FA admin access (OTP)</div>
                    <div>&gt; 4-tier RBAC hierarchy</div>
                    <div>&gt; Docker network isolation</div>
                    <div>&gt; Nginx TLS termination</div>
                  </div>
                </div>
                <div className="border border-gray-800/50 rounded p-4 bg-gray-900/20">
                  <div className="text-red-500 text-[10px] tracking-wider mb-2">CYPHER DOES NOT</div>
                  <div className="space-y-1.5 text-xs text-gray-500">
                    <div>&gt; Store private keys</div>
                    <div>&gt; Custody funds</div>
                    <div>&gt; Require KYC</div>
                    <div>&gt; Require email</div>
                    <div>&gt; Track identity beyond wallet</div>
                    <div>&gt; Maintain off-chain orderbooks</div>
                    <div>&gt; Operate as money transmitter</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 10: Roadmap */}
          <section data-section className="mb-16">
            <SectionHeader num="10" title="DEVELOPMENT ROADMAP" />
            <div className="space-y-6">
              <RoadmapPhase phase="1" status="SHIPPED" color="text-green-400" items={[
                'Bloomberg Terminal dashboard with real-time multi-source aggregation',
                'Runes Professional Terminal with TradingView-grade charts',
                'Ordinals explorer with provenance chain visualization',
                'Multi-wallet: Xverse, UniSat, LaserEyes, MetaMask, Phantom, WalletConnect',
                'Multi-DEX aggregation + THORChain cross-chain swaps',
                'CYPHER AI: sentiment, neural prediction, signals, PT-BR voice',
                'Portfolio tracking across 9 networks',
                'Protocol-native fee infrastructure',
                'Supabase + Redis + job scheduler + Docker + Prometheus + Grafana',
              ]} />
              <RoadmapPhase phase="2" status="IN PROGRESS" color="text-[#F7931A]" items={[
                'Treasury multi-sig wallet deployment',
                'Treasury dashboard (holdings + acquisition history)',
                'Automated buyback execution engine',
                'Monthly transparency report system',
                'Community collection proposal mechanism',
              ]} />
              <RoadmapPhase phase="3" status="SCHEDULED" color="text-gray-500" items={[
                'Mobile-optimized terminal layout',
                'Advanced orders: limit, stop-loss, trailing stop',
                'Desktop application (Electron)',
                'Plugin architecture for extensions',
                'Institutional API tier',
              ]} />
              <RoadmapPhase phase="4" status="HORIZON" color="text-gray-700" items={[
                'CYPHER governance token (utility + treasury voting)',
                'DAO transition for treasury management',
                'Social trading / copy-trade',
                'Multi-language AI voice (EN, ES, JP)',
              ]} />
            </div>
          </section>

          {/* Section 11: Commitment */}
          <section data-section className="mb-16">
            <SectionHeader num="11" title="THE CYPHERPUNK COMMITMENT" />
            <div className="space-y-6">
              <div className="space-y-4 text-sm leading-relaxed">
                <div>
                  <span className="text-[#F7931A] font-bold">Non-custodial by architecture.</span>
                  <span className="text-gray-500"> We never hold keys, funds, or personally identifiable data. The wallet connects, the transaction executes, the wallet disconnects. CYPHER is a lens — never a vault.</span>
                </div>
                <div>
                  <span className="text-[#F7931A] font-bold">Permissionless access.</span>
                  <span className="text-gray-500"> Connect a wallet. Trade. That is the complete onboarding sequence. No KYC. No email. No identity verification.</span>
                </div>
                <div>
                  <span className="text-[#F7931A] font-bold">Verify, don&rsquo;t trust.</span>
                  <span className="text-gray-500"> Treasury wallets are public addresses. Fee transactions are on-chain events. The blockchain either confirms or refutes. No intermediary required.</span>
                </div>
                <div>
                  <span className="text-[#F7931A] font-bold">Provenance is the product.</span>
                  <span className="text-gray-500"> Every feature traces to one question: </span>
                  <em className="text-gray-400">can you cryptographically verify the history of what you&rsquo;re acquiring?</em>
                </div>
                <div>
                  <span className="text-[#F7931A] font-bold">Culture merits preservation.</span>
                  <span className="text-gray-500"> The inscriptions minted in 2023 and 2024 are the genesis artifacts of a digital civilization. They deserve a treasury that holds them — permanently.</span>
                </div>
                <div>
                  <span className="text-[#F7931A] font-bold">Builders ship.</span>
                  <span className="text-gray-500"> This whitepaper describes a deployed, operational system. The code is public. Fork it, audit it, improve it, or compete with it.</span>
                </div>
              </div>

              <div className="text-center text-gray-600 text-sm italic mt-8">
                Cypherpunks write code.
              </div>
            </div>
          </section>

          {/* Footer / Signature */}
          <section className="mb-8">
            <div className="border border-[#F7931A]/20 rounded p-6 bg-[#F7931A]/5 text-center">
              <div className="text-[#F7931A] font-bold text-sm mb-1">0xcypher65</div>
              <div className="text-gray-500 text-xs mb-3">Aeon #1938 — Aeons Collection</div>
              <div className="text-gray-600 text-xs italic mb-4">
                &ldquo;We write code. We stack sats. We preserve what matters.&rdquo;
              </div>
              <div className="flex justify-center gap-6 text-[10px] text-gray-600">
                <span>cypherordifuture.xyz</span>
                <span>github.com/0xjc65eth/CYPHER-V3</span>
              </div>
            </div>
            <div className="text-center mt-4 text-[10px] text-gray-700">
              No rights reserved. v2.0 — February 2026
            </div>
          </section>

          {/* Spacer for bottom bar */}
          <div className="h-8" />
        </div>
      </div>

      {/* Bottom Accept Bar */}
      <div className="border-t border-[#F7931A]/30 bg-black/95 backdrop-blur-sm sticky bottom-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="text-gray-500 text-xs hidden sm:block">
            {scrolledToBottom ? (
              <span className="text-green-400">&#9679; Document reviewed</span>
            ) : (
              <span>&#9675; Scroll to review the complete document</span>
            )}
          </div>
          <button
            onClick={handleAccept}
            disabled={!scrolledToBottom}
            className={`px-8 py-2.5 rounded text-sm font-bold tracking-wider transition-all duration-300 ${
              scrolledToBottom
                ? 'bg-[#F7931A] text-black hover:bg-[#F7931A]/90 cursor-pointer shadow-lg shadow-[#F7931A]/20'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {scrolledToBottom ? 'I HAVE READ AND ACCEPT — ENTER CYPHER' : 'READ THE WHITEPAPER TO CONTINUE'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Subcomponents ──

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 border-b border-gray-800/50 pb-3">
      <span className="text-[#F7931A]/40 text-xs font-bold">{num}</span>
      <h2 className="text-[#F7931A] text-sm font-bold tracking-widest">{title}</h2>
    </div>
  )
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-gray-300 text-xs font-bold tracking-wider mb-3">{title}</h3>
      <div className="text-gray-500 text-sm leading-relaxed space-y-3">{children}</div>
    </div>
  )
}

function HighlightBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 border-l-2 border-[#F7931A] pl-4 text-[#F7931A]/80 text-sm font-bold">
      {children}
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="border border-gray-800/50 rounded p-4 bg-gray-900/20">
      <div className="text-gray-300 text-xs font-bold mb-2">{title}</div>
      <div className="text-gray-500 text-xs leading-relaxed">{description}</div>
    </div>
  )
}

function ModuleRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-2 border-b border-gray-800/20 text-xs">
      <span className="text-[#F7931A] w-40 shrink-0 font-bold">{name}</span>
      <span className="text-gray-500">{desc}</span>
    </div>
  )
}

function WalletCard({ name, chain, assets }: { name: string; chain: string; assets: string }) {
  return (
    <div className="border border-gray-800/50 rounded px-3 py-2 bg-gray-900/20 text-xs">
      <div className="text-gray-300 font-bold">{name}</div>
      <div className="text-gray-600">{chain} &mdash; {assets}</div>
    </div>
  )
}

function CollectionRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-2 border-b border-gray-800/20 text-xs">
      <span className="text-[#F7931A] w-40 shrink-0 font-bold">{name}</span>
      <span className="text-gray-500">{desc}</span>
    </div>
  )
}

function StackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-gray-800/20 text-xs">
      <span className="text-gray-500 w-24 shrink-0">{label}</span>
      <span className="text-gray-400">{value}</span>
    </div>
  )
}

function RoadmapPhase({ phase, status, color, items }: { phase: string; status: string; color: string; items: string[] }) {
  return (
    <div className="border border-gray-800/50 rounded p-4 bg-gray-900/20">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-gray-600 text-xs">PHASE {phase}</span>
        <span className={`text-[10px] tracking-widest font-bold ${color}`}>{status}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 text-xs text-gray-500">
            <span className={color === 'text-green-400' ? 'text-green-500' : 'text-gray-700'}>
              {color === 'text-green-400' ? '&#10003;' : '&#9675;'}
            </span>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}
