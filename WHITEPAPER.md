# CYPHER — WHITEPAPER v1.0

```
 ██████╗██╗   ██╗██████╗ ██╗  ██╗███████╗██████╗
██╔════╝╚██╗ ██╔╝██╔══██╗██║  ██║██╔════╝██╔══██╗
██║      ╚████╔╝ ██████╔╝███████║█████╗  ██████╔╝
██║       ╚██╔╝  ██╔═══╝ ██╔══██║██╔══╝  ██╔══██╗
╚██████╗   ██║   ██║     ██║  ██║███████╗██║  ██║
 ╚═════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝

        PROVENANCE IS PROOF. SATS ARE SOVEREIGNTY.
```

**0xcypher65** — Aeon #1938, Aeons Collection
**February 2026 — v1.0**

---

> *"Privacy is necessary for an open society in the electronic age."*
> — Eric Hughes, A Cypherpunk's Manifesto, 1993

---

## 0. TL;DR

CYPHER is a non-custodial trading terminal for Bitcoin-native assets — Ordinals, Runes, Rare Sats — with cross-chain execution across 9 networks.

What makes it different:

- **Provenance-first**: Every asset tracked from inscription to current holder. If you can't verify the chain of custody, you don't own what you think you own.
- **One terminal, all markets**: Magic Eden, UniSat, OKX, Hiro — aggregated. Stop switching tabs.
- **Sats-in, culture-out**: 70% of net revenue flows to a multi-sig treasury that buys back foundational Bitcoin collections. The other 30% keeps the servers running. No token. No VC. No bullshit.
- **Built by a degen**: 0xcypher65, Aeon #1938. The code is the identity.

If you want the details, keep reading. If you want the app: [cypherordifuture.xyz](https://cypherordifuture.xyz). If you want the code: [github.com/0xjc65eth/CYPHER-V3](https://github.com/0xjc65eth/CYPHER-V3).

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [Provenance — Why It's Everything](#2-provenance--why-its-everything)
3. [The Terminal](#3-the-terminal)
4. [Stacking Sats Through CYPHER](#4-stacking-sats-through-cypher)
5. [CYPHER AI](#5-cypher-ai)
6. [Treasury — The Buyback Vault](#6-treasury--the-buyback-vault)
7. [Fee Model](#7-fee-model)
8. [Architecture](#8-architecture)
9. [Roadmap](#9-roadmap)
10. [The Commitment](#10-the-commitment)

---

## 1. The Problem

You already know what Ordinals and Runes are. You wouldn't be reading this otherwise.

What you also know is that the tooling is broken:

**Fragmented.** Your Runes data is on Hiro. Your Ordinals listings are on Magic Eden. Your floor prices are on UniSat. Your EVM portfolio is on DeBank. Your Bitcoin mempool is on mempool.space. Your charts are on TradingView. You have 14 tabs open and you're still missing information.

**Amateur.** Traditional finance has Bloomberg Terminal — $24K/year for a reason. It works. Crypto traders get colorful dashboards designed by UI interns who've never placed a trade. Information density is sacrificed for "clean design." You don't need clean. You need complete.

**Blind on provenance.** You bought an Ordinal. Do you know which sat carries it? Do you know every wallet that held it before you? Do you know if the inscription was minted from the creator's original address or a copycat? If you can't answer all three, you're trading on faith — and faith is not a cypherpunk value.

**No sat-stacking infrastructure.** Arbitrage between Runes marketplaces exists. Cross-chain inefficiencies exist. Better routing exists. But there's no single tool that finds these opportunities, quantifies them, and lets you execute — all in one place.

CYPHER solves all four.

---

## 2. Provenance — Why It's Everything

### The Core Argument

In a world of AI-generated content, infinite reproduction, and deepfakes — **provenance is the only thing that separates an original from a copy.**

Bitcoin is the strongest provenance machine ever built:
- Proof-of-work timestamps are backed by real energy expenditure — no other chain can match this
- The UTXO model creates an unbroken chain of custody for every satoshi
- Inscription data is immutable once confirmed — no admin key can modify it
- No smart contract risk, no proxy upgrades, no ruggable metadata

This isn't philosophical. It's practical. A sub-1K inscription with verified provenance is worth orders of magnitude more than inscription #5,000,000 with ambiguous history. Provenance IS value.

### What CYPHER Does With It

**Inscription provenance chain**: Every inscription displayed in CYPHER shows its full ownership history — from the minting transaction to the current holder. Every intermediate wallet. Every transfer timestamp.

**Sat-level tracking**: CYPHER classifies sats by rarity (common, uncommon, rare, epic, legendary, mythic) and by origin — halving blocks, difficulty adjustments, early coinbases. The sat's story is the asset's story.

**Collection authentication**: Before you bid on a "NodeMonke" or an "Aeon," CYPHER verifies the inscription traces back to the collection's authenticated minting address. Fakes are flagged.

**Runes etching provenance**: Every Rune tracked from its etching block through every mint and transfer. Protocol-native data, not indexer-dependent claims.

This isn't a feature list. It's the thesis: **if your platform doesn't verify provenance, it's a liability.**

---

## 3. The Terminal

### Design Principles

1. **Density over decoration.** Every pixel shows data. Orange on black — because Bitcoin is orange and trading happens at night.
2. **Real-time or nothing.** WebSocket feeds for prices, mempool activity, and inscription events. If it's more than 5 seconds old, it's stale.
3. **One tab.** Everything you need — market data, portfolio, trading, AI, arbitrage — in a single terminal session.

### What's Inside

| Module | What You Get |
|--------|-------------|
| **Market Dashboard** | Real-time prices (100+ assets), Bitcoin hashrate, mempool fees, Fear & Greed Index, Lightning stats |
| **Runes Terminal** | Aggregated data from Hiro + UniSat + OKX. TradingView charts (candlestick, volume, multi-timeframe). Market table with sort/filter/favorites. Arbitrage scanner. |
| **Ordinals Explorer** | Inscription browser with provenance chain. Rarity classification. Collection floor tracking from Magic Eden + UniSat. |
| **Rare Sats** | Discovery and filtering by rarity class, origin block, special properties. |
| **Portfolio** | Multi-chain view: BTC, ETH, SOL, MATIC, ARB, OP, BASE, AVAX, BSC. Real-time P&L in sats and USD. NFT + inscription + Rune holdings. |
| **Trading** | Multi-DEX routing (1inch, Paraswap, Jupiter, Uniswap, THORChain). Cross-chain swaps. Quick trade execution. |
| **Arbitrage** | Real-time cross-marketplace scanning for Runes and Ordinals price discrepancies. |
| **CYPHER AI** | Market analysis, trading signals, voice interface (PT-BR). See [Section 5](#5-cypher-ai). |

### Wallets Supported

| Wallet | Chain | Assets |
|--------|-------|--------|
| Xverse | Bitcoin | BTC, Ordinals, Runes, BRC-20 |
| UniSat | Bitcoin | BTC, Ordinals, Runes, BRC-20 |
| LaserEyes | Bitcoin | BTC native |
| MetaMask | EVM | ETH, ERC-20, L2 tokens |
| Phantom | Solana | SOL, SPL tokens |
| WalletConnect | Multi | Universal EVM |

**Non-custodial.** CYPHER never touches your private keys. Transactions are signed in your wallet. We are a frontend, not a custodian.

---

## 4. Stacking Sats Through CYPHER

The terminal isn't just for looking at numbers. It's built to help you accumulate more sats. Here's how:

### Arbitrage Execution
CYPHER scans price differences across Runes and Ordinals marketplaces in real-time. When DOG•GO•TO•THE•MOON is listed at 450 sats/unit on Magic Eden and 465 sats/unit on UniSat — you see the spread, the net profit after fees, and can execute both sides from one interface.

### Best-Price Routing
When you swap through CYPHER, the aggregation engine queries 1inch, Paraswap, Jupiter, Uniswap, and THORChain simultaneously. You get the best available rate across all liquidity sources. Better rate = more sats per trade.

### Cross-Chain to BTC
Holding altcoins you want to convert? CYPHER routes through THORChain for native cross-chain swaps — ETH→BTC, SOL→BTC, no wrapped assets, no bridge risk. Swap and stack.

### AI Signals
CYPHER AI generates trading signals with entry, target, stop-loss, and confidence score. Sources include neural network prediction, Smart Money Concepts analysis, and social sentiment. You decide whether to act — the AI gives you the edge.

### Zero Fees for YHP Holders
Hold a YHP (Your Holder Pass) and every fee drops to 0%. Every basis point you save is a basis point stacked.

---

## 5. CYPHER AI

Not a chatbot. An intelligence layer.

### What It Does

**Sentiment scoring.** Aggregates Twitter/X, crypto news, and on-chain whale movements into a directional sentiment score — updated in real-time.

**Neural prediction.** TensorFlow.js models running on-device (not a remote API call you can't verify). Short-term price forecasting with confidence intervals. Model accuracy is tracked and displayed.

**Trading signals.** Structured output:
```
SIGNAL:      BUY
ASSET:       BTC
CONFIDENCE:  0.82
ENTRY:       $97,400
TARGET:      $103,200
STOP-LOSS:   $94,800
SOURCE:      neural + smc
```
Every signal is stored in the database with full metadata. You can audit signal history and accuracy over time.

**Smart Money Concepts.** Institutional-style analysis — order blocks, fair value gaps, liquidity sweeps, break of structure. Automated, not manual.

### Voice Interface

CYPHER speaks Brazilian Portuguese via ElevenLabs. The voice adapts to context — energetic on opportunities, measured on analysis, cautious on risk. Speech-to-text is supported for hands-free operation.

*Why Portuguese?* Because the Brazilian crypto community is one of the largest and most underserved in the world. And because 0xcypher65 builds for his people first.

---

## 6. Treasury — The Buyback Vault

> *"If we don't preserve the collections that defined Bitcoin culture, no one will."*

### The Model

CYPHER charges fees on trades (see [Section 7](#7-fee-model)). After covering operational costs (servers, APIs, infrastructure), the revenue splits:

| Allocation | % of Net Revenue | Purpose |
|-----------|------------------|---------|
| **Treasury Vault** | 70% | Collection buybacks — permanent holdings |
| **Operations** | 30% | Infrastructure, development, API costs |

Why not 100% to treasury? Because that would be a lie. Servers cost money. API keys cost money. Development costs money. 70/30 is honest — and the 30% is what keeps the platform alive to generate the 70%.

### Why Buybacks?

Some Bitcoin collections are the genesis artifacts of a cultural movement. Aeons, NodeMonkes, Puppets, OMB — these were minted when nobody cared about Ordinals. They represent the first chapter of a new digital civilization.

Markets are short-sighted. Floors bleed during bear markets. Creators move on. Collections get forgotten. Then years later, people realize those early inscriptions were historically significant — and they're scattered across dead wallets.

The CYPHER Treasury buys and holds. Permanently.

### Target Collections

**Tier 1 — Foundational**

| Collection | Why It Matters |
|-----------|---------------|
| **Aeons** | Genesis-era generative art on Bitcoin. Proved inscriptions could be fine art. Home of Aeon #1938 — 0xcypher65. |
| **Bitcoin Puppets** | Rallied the community. Showed Ordinals culture could be irreverent, funny, and valuable. |
| **NodeMonkes** | First 10K PFP on Bitcoin. Historical milestone — everything after stands on their shoulders. |
| **Quantum Cats** | Taproot Wizards. Pushed the protocol's technical boundaries. |
| **OMB** | Ordinal Maxi Biz. The OGs who were here before anyone cared. |

**Tier 2 — Artifacts**

| Category | Why |
|----------|-----|
| Sub-1K inscriptions | The first 1,000 inscriptions. Digital antiquities. |
| Rare Sats | Uncommon, rare, epic, legendary sats from special blocks. |
| Cursed Inscriptions | Protocol edge cases that became historical artifacts. |

**Tier 3 — Emerging**
New collections evaluated quarterly. Community can propose via governance.

### Trust Model

*"Don't trust 0xcypher65. Verify the treasury."*

- **Multi-sig wallet**: Treasury operates under a 2-of-3 multi-sig. Keys held by 0xcypher65 + two independent community members (to be announced with wallet deployment).
- **On-chain verifiable**: Treasury wallets are public. Every buyback transaction is visible on the blockchain. No backend databases — the chain is the ledger.
- **Monthly reports**: Revenue, buyback executions, current holdings — published monthly. If the numbers don't add up, the community calls it out.
- **No liquidation clause**: Treasury assets are NEVER sold, lent, or used as collateral. Bought = held forever.

### Treasury Wallets

| Chain | Address |
|-------|---------|
| Bitcoin | `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh` |
| Ethereum | `0x476F803fEA41CC6DfbCb3F4Ba6bAF462c1AD32AB` |
| Solana | `EPbE1ZmLXkEJDitNb9KNu9Hq8mThS3P7LpBxdF3EkUwT` |

---

## 7. Fee Model

Transparent. Protocol-native. No hidden charges.

### Schedule

| Protocol | Fee | How It's Collected |
|----------|-----|--------------------|
| THORChain | 0.50% (50 bps) | Affiliate fee — deducted from swap output by THORChain itself |
| Jupiter / Solana | 0.35% (35 bps) | platformFeeBps — deducted by Jupiter, sent to fee account |
| 1inch / EVM DEX | 0.30% (30 bps) | Referrer fee — deducted by 1inch, sent to referrer address |
| Paraswap / EVM | 0.30% (30 bps) | Partner fee — deducted by Paraswap, sent to partner address |
| Magic Eden / BTC | 0.35% (35 bps) | Fee output in PSBT — paid as part of Bitcoin transaction |

### Caps
- Maximum: $100 per trade
- Minimum: $0.01 per trade

### YHP Premium: 0% Everything
Hold a YHP → all fees are zero. Verified on-chain.

### Important Detail
Fees are collected **natively by each protocol** — not by CYPHER's backend. THORChain deducts the affiliate fee. Jupiter deducts the platform fee. 1inch deducts the referrer fee. CYPHER doesn't touch your funds at any point. The fee goes directly from the protocol to the fee wallet.

This is verifiable. Check the fee wallet transactions against the fee schedule. The math adds up or it doesn't.

### Revenue Flow
```
Trade executed → Protocol collects fee natively → Fee wallet receives
                                                        │
                                              ┌─────────┴──────────┐
                                              │    Net Revenue      │
                                              ├─────────────────────┤
                                              │  70% → Treasury     │
                                              │  (Buyback Vault)    │
                                              │                     │
                                              │  30% → Operations   │
                                              │  (Infra + Dev)      │
                                              └─────────────────────┘
```

---

## 8. Architecture

For builders and auditors. Skip if you don't care how the engine works.

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS |
| State | Zustand + React Query 5 |
| Charts | TradingView Lightweight Charts, ApexCharts |
| Database | Supabase (PostgreSQL) with in-memory fallback |
| Cache | Redis (ioredis) with SimpleCache fallback |
| Real-time | WebSocket server (port 8080) |
| AI/ML | TensorFlow.js (on-device), OpenAI, ElevenLabs |
| Blockchain | ethers.js, viem, @solana/web3.js, LaserEyes SDK |
| Monitoring | Prometheus (port 9090), Grafana |
| Deploy | Docker Compose: app + redis + postgres + nginx + prometheus + grafana |

### Service Count
70+ specialized services across market data, trading, AI, portfolio, voice, arbitrage, and infrastructure. Not a monolith — each service is domain-scoped and independently testable.

### Data Sources

| Source | Data |
|--------|------|
| Hiro | Ordinals, Runes, Bitcoin state |
| Magic Eden | Ordinals + Runes marketplace (listings, floors, activity) |
| UniSat | Bitcoin wallet, BRC-20, Runes data |
| OKX | Ordinals/Runes secondary data |
| Ordiscan | Inscription metadata and provenance |
| CoinGecko | Price data, market trends |
| CoinMarketCap | Market cap rankings |
| Binance | KLINES via WebSocket |
| Mempool.space | Bitcoin mempool, fee estimates |
| THORChain | Cross-chain swap routing |
| Jupiter | Solana DEX aggregation |
| 1inch | EVM DEX aggregation |
| Paraswap | EVM DEX routing |

### Resilience
- Database: Supabase primary → in-memory fallback (terminal stays operational if DB is down)
- Cache: Redis primary → SimpleCache fallback (same principle)
- API: Multi-source aggregation means if one provider is down, others cover
- Jobs: Distributed scheduler with Redis locks prevents duplicate execution

### Security
- Non-custodial — zero access to private keys
- Rate limiting per endpoint (per-IP + per-user)
- Input validation via Zod on all API routes
- Admin access requires 2FA (OTP)
- RBAC: user → premium → admin → super_admin
- Docker containerization with network isolation
- Nginx reverse proxy with TLS

---

## 9. Roadmap

### Shipped

- Bloomberg Terminal dashboard with real-time multi-source data
- Runes Professional Terminal (charts, tables, arbitrage, live feed)
- Ordinals explorer with provenance tracking
- Multi-wallet support (Xverse, UniSat, LaserEyes, MetaMask, Phantom, WalletConnect)
- Multi-DEX aggregation + cross-chain swaps via THORChain
- CYPHER AI (sentiment, neural prediction, signals, voice PT-BR)
- Portfolio tracking across 9 chains
- Fee collection infrastructure (all protocols)
- Supabase + Redis + job scheduler
- Docker deployment with Prometheus + Grafana monitoring

### In Progress

- Treasury multi-sig wallet deployment
- Treasury dashboard (real-time holdings, buyback history)
- Automated buyback execution engine
- Monthly transparency report system
- Community collection proposal mechanism

### Next

- Mobile-optimized terminal layout
- Advanced order types (limit, stop-loss, trailing stop)
- Desktop application (Electron)
- Plugin system for third-party extensions
- Institutional API tier

### Future

- CYPHER governance token (utility + treasury voting rights)
- DAO transition for treasury management
- Social trading / copy-trade
- Multi-language AI voice (English, Spanish, Japanese)

---

## 10. The Commitment

CYPHER is built on cypherpunk values. Not as branding. As engineering decisions.

**Non-custodial by design.** We never hold your keys, your funds, or your data. Wallet connects, trade executes, wallet disconnects. We are a lens, not a vault.

**No KYC.** Connect a wallet. Trade. That's the entire onboarding flow.

**Verify, don't trust.** Treasury wallets are public. Fee transactions are on-chain. Buyback executions are visible to anyone with a block explorer. If 0xcypher65 says 70% goes to treasury, the blockchain either confirms it or doesn't.

**Provenance is the product.** Not as a buzzword. As the core thesis. Every feature in CYPHER traces back to one question: *can you verify the history of what you're buying?* If the answer is no, the tooling has failed you.

**Culture is worth preserving.** The inscriptions minted in 2023 and 2024 are the cave paintings of the digital age. They deserve more than a floor price chart. They deserve a treasury that accumulates and holds them — permanently — as proof that this community valued what it created.

**Builders ship.** The terminal is live. The trades execute. The AI responds. The fees collect. This whitepaper describes a working product, not a promise.

---

```
┌─────────────────────────────────────────────┐
│                                             │
│   0xcypher65                                │
│   Aeon #1938 — Aeons Collection             │
│                                             │
│   "We write code. We stack sats.            │
│    We preserve what matters."               │
│                                             │
│   CYPHER ORDi FUTURE V3                     │
│   https://cypherordifuture.xyz              │
│   https://github.com/0xjc65eth/CYPHER-V3    │
│                                             │
└─────────────────────────────────────────────┘
```

---

---

**Links**

| | |
|---|---|
| **Website** | [https://cypherordifuture.xyz](https://cypherordifuture.xyz) |
| **GitHub** | [https://github.com/0xjc65eth/CYPHER-V3](https://github.com/0xjc65eth/CYPHER-V3) |
| **Treasury (BTC)** | `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh` |
| **Treasury (ETH)** | `0x476F803fEA41CC6DfbCb3F4Ba6bAF462c1AD32AB` |
| **Treasury (SOL)** | `EPbE1ZmLXkEJDitNb9KNu9Hq8mThS3P7LpBxdF3EkUwT` |

*No rights reserved. Cypherpunks write code.*

*v1.0 — February 2026*
