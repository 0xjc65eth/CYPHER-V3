<div align="center">
  <img src="public/cypher-icon.svg" alt="CYPHER V3" width="80" height="80" />

  # CYPHER V3

  **Professional Bitcoin Trading Terminal**

  [![Next.js 15](https://img.shields.io/badge/Next.js-15-000?logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![License](https://img.shields.io/badge/License-Proprietary-FF6B00)](#license)

  A Bloomberg Terminal-inspired platform for Bitcoin, Ordinals, Runes, and BRC-20 trading.

  [Getting Started](#getting-started) · [Features](#features) · [Architecture](#architecture) · [API Reference](#api-reference) · [Deployment](#deployment)
</div>

---

## Overview

CYPHER V3 is a professional-grade cryptocurrency trading terminal built for serious Bitcoin traders. It combines real-time market data from multiple sources, AI-powered analytics, and an autonomous trading agent — all in a dense, Bloomberg-style interface designed for speed and clarity.

**What makes it different:**
- **100% real data** — zero mock data, every number is live and verifiable
- **Ordinals + Runes native** — first-class support for Bitcoin NFTs and fungible tokens
- **AI Trading Agent** — autonomous multi-strategy agent with risk management
- **Multi-source aggregation** — Hiro, Xverse, UniSat, OKX, CoinGecko, Mempool.space

## Getting Started

### Prerequisites

- Node.js ≥ 20.18.0
- npm ≥ 9.0

### Quick Start

```bash
git clone https://github.com/0xjc65eth/CYPHER-V3.git
cd CYPHER-V3
npm install
cp .env.example .env.local   # configure API keys
npm run dev                   # http://localhost:4444
```

### Environment Variables

All API keys are server-side only (never exposed to the browser):

| Variable | Service | Required |
|----------|---------|----------|
| `HIRO_API_KEY` | Ordinals, Runes, BRC-20 (Hiro) | Yes |
| `XVERSE_API_KEY` | Ordinals, Runes, BRC-20 (Xverse) | Yes |
| `UNISAT_API_KEY` | BRC-20, Inscriptions (UniSat) | Yes |
| `COINGECKO_API_KEY` | Market data, prices | Yes |
| `ORDISCAN_API_KEY` | Rare Sats scanning | Yes |
| `OKX_API_KEY` | NFT marketplace data | No |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Database | Yes |
| `REDIS_URL` / `REDIS_TOKEN` | Cache (Upstash) | No* |
| `STRIPE_SECRET_KEY` | Payments | No |
| `GEMINI_API_KEY` | AI Chat | No |
| `AGENT_PRIVATE_KEY` | Trading Agent (Hyperliquid) | No |

*Falls back to in-memory cache when Redis is not configured.

## Features

### Market Data
- Real-time BTC price with WebSocket updates
- Market overview (dominance, Fear & Greed, total market cap)
- Bitcoin fee estimates from Mempool.space
- Multi-source price aggregation with automatic failover

### Ordinals
- Top collections by volume (24h / 7d / 30d)
- Floor prices, holder counts, and listing data
- Collection detail pages with historical floor charts
- Data from Hiro + Xverse with OKX fallback

### Runes
- Market data for all Runes tokens
- Price in sats, market cap, volume, holders
- Gainers/losers tracking
- Arbitrage opportunity detection

### BRC-20
- Token listings with floor prices
- Volume tracking across marketplaces
- Batch price lookups via Xverse

### Rare Sats
- 9+ satribute categories (Uncommon → Mythic)
- Address scanning for rare satoshis
- Valuation estimates per category

### AI Trading Agent
- Autonomous multi-strategy engine (Scalping, Market Making, LP)
- Multi-agent consensus system (Technical, Sentiment, Risk, LLM)
- Hyperliquid integration for spot and perpetuals
- Risk management: max drawdown, liquidation guard, MEV protection
- Setup wizard with 5-step configuration UI

### AI Chat
- Gemini-powered market assistant
- Real-time market context injection
- Portfolio-aware responses

### Wallet Integration
- LaserEyes: Xverse, UniSat, OYL wallets
- EVM wallets via wagmi/WalletConnect
- Portfolio view with BTC + Ordinals + Runes + BRC-20

### Premium Tiers
- Free, Explorer ($29), Trader ($79), Hacker Yields ($149)
- Stripe integration with webhook processing
- Wallet-based activation for ETH payments

## Architecture

```
src/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── api/                # 20+ REST endpoints
│   ├── dashboard/          # Main trading dashboard
│   ├── trading-agent/      # AI agent UI
│   └── ...                 # Feature pages
├── agent/                  # Trading agent engine
│   ├── core/               # Orchestrator, auto-compound
│   ├── consensus/          # Multi-agent voting
│   ├── connectors/         # Exchange integrations
│   ├── risk/               # Risk management
│   └── strategies/         # Trading strategies
├── components/             # React components
├── hooks/                  # Custom hooks
├── lib/                    # Shared utilities
│   ├── api/                # API clients (Hiro, Xverse, UniSat, OKX, etc.)
│   ├── cache/              # Redis with in-memory fallback
│   ├── database/           # Supabase service
│   └── infrastructure/     # Bootstrap, jobs, monitoring
├── services/               # Business logic
└── contexts/               # React context providers
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict) |
| UI | React 18, Tailwind CSS, Radix UI |
| State | Zustand, React Query v5 |
| Charts | TradingView Lightweight Charts |
| Wallets | LaserEyes, sats-connect, wagmi |
| Database | Supabase (PostgreSQL) |
| Cache | Upstash Redis / in-memory fallback |
| Payments | Stripe |
| AI | Gemini (primary), OpenAI, Anthropic |
| Trading | Hyperliquid SDK, CCXT v4 |

### Data Pipeline

```
External APIs → Server-side fetch → Redis cache (15-300s TTL) → API Routes → React Query → UI
                                    ↓ fallback
                              In-memory cache
```

Sources are tried in priority order with automatic failover:
**Ordinals/Runes**: Xverse → Hiro → OKX
**BRC-20**: Xverse → UniSat → Hiro
**Market data**: CoinGecko → Binance (fallback)
**Fees**: Mempool.space (public)

## API Reference

### Market Data
| Endpoint | Description |
|----------|------------|
| `GET /api/market/bitcoin` | BTC price, 24h change, volume, market cap |
| `GET /api/market/overview` | Global market stats, Fear & Greed |
| `GET /api/fees` | Bitcoin fee estimates (sat/vB) |

### Ordinals
| Endpoint | Description |
|----------|------------|
| `GET /api/ordinals/collections` | Top collections by volume |
| `GET /api/ordinals/trending` | Trending collections |
| `GET /api/ordinals-stats` | Aggregated ordinals statistics |

### Runes
| Endpoint | Description |
|----------|------------|
| `GET /api/runes/market` | Runes market data |
| `GET /api/runes/trending` | Trending runes |
| `GET /api/runes/market-overview` | Market overview with gainers/losers |

### BRC-20
| Endpoint | Description |
|----------|------------|
| `GET /api/brc20/list` | BRC-20 token listings |
| `GET /api/brc20/tokens` | Token details with prices |

### Rare Sats
| Endpoint | Description |
|----------|------------|
| `GET /api/rare-sats/categories` | Satribute categories |

### Trading Agent
| Endpoint | Description |
|----------|------------|
| `GET /api/agent` | Agent state and metrics |
| `POST /api/agent` | Control: start, stop, pause, resume, emergency_stop |

### Health
| Endpoint | Description |
|----------|------------|
| `GET /api/health` | Service health check (cache, DB, APIs) |

## Scripts

```bash
npm run dev          # Development server (port 4444)
npm run build        # Production build
npm run start        # Production server
npm run type-check   # TypeScript validation
npm run lint         # ESLint
npm run lint:fix     # ESLint auto-fix
npm run test         # Run tests
npm run format       # Prettier formatting
```

## Deployment

### Vercel (Recommended)

Push to `main` for automatic deployment. Environment variables must be configured in Vercel dashboard.

### Docker

```bash
docker compose up -d    # app + redis + postgres + prometheus + grafana + nginx
```

### Manual

```bash
npm run build && npm run start
```

## Design System

Bloomberg Terminal-inspired with high information density:

| Token | Hex | Usage |
|-------|-----|-------|
| Orange | `#FF6B00` | CTAs, primary actions |
| Background | `#000000` | Terminal background |
| Surface | `#0a0a0a` | Cards, panels |
| Success | `#00FF41` | Profit, positive values |
| Danger | `#FF0040` | Loss, errors |
| Warning | `#FFB800` | Alerts, caution |
| Purple | `#8B5CF6` | Rare Sats module |

**Typography**: JetBrains Mono (numbers, tabular-nums) · Space Grotesk (text)

## License

Proprietary software. All rights reserved. © 2025-2026

---

<div align="center">
  <sub>Built for traders who demand real data, real speed, and zero compromises.</sub>
</div>
