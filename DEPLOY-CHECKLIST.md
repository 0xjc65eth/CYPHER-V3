# CYPHER V3 — Production Deploy Checklist

## Pre-Deploy: Key Rotation (CRITICAL)

These keys are visible in the `.env` file and MUST be rotated before production:

| Service | Key to Rotate | Dashboard |
|---------|--------------|-----------|
| **Stripe** | `sk_live_51S5R02...` | https://dashboard.stripe.com/apikeys |
| **Stripe Webhook** | `whsec_BIJ...` | https://dashboard.stripe.com/webhooks |
| **Grok/xAI** | `xai-i9c5tAV...` | https://console.x.ai/api-keys |
| **ElevenLabs** | `sk_9c2c1f4...` | https://elevenlabs.io/app/settings/api-keys |
| **Gemini** | `AIzaSyAk...` | https://aistudio.google.com/apikey |
| **Hiro** | `3100ea76...` | https://platform.hiro.so/settings/api-keys |
| **UniSat** | `a569bf81...` | https://developer.unisat.io/ |
| **Magic Eden** | `1d920435...` | https://developer.magiceden.dev/ |
| **Ordiscan** | `e227a764...` | https://ordiscan.com/developer |
| **CMC** | `c045d2a9...` | https://pro.coinmarketcap.com/account |
| **Dune** | `0ms5z3uS...` | https://dune.com/settings/api |
| **NewsAPI** | `2ad03131...` | https://newsapi.org/account |
| **Hyperliquid** | `0x13083...` | Generate new in Hyperliquid app |

After rotating, set the NEW keys in Vercel Environment Variables (not in files).

## Step 1: Supabase Setup

1. Go to your Supabase project: https://supabase.com/dashboard
2. **Get the real Service Role Key**: Settings → API → `service_role` key
3. **Run migrations**: SQL Editor → paste each file from `database/migrations/` in order (001-007)
   - Or use `database/run-all-migrations.sql` if using psql CLI
4. **Verify tables**: Run `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`

## Step 2: Vercel Environment Variables

Go to: Vercel Dashboard → Project → Settings → Environment Variables

### Required (app won't work without these):
```
NEXTAUTH_SECRET=<generate new: openssl rand -hex 32>
JWT_SECRET=<generate new: openssl rand -hex 32>
ADMIN_JWT_SECRET=<generate new: openssl rand -hex 32>
AGENT_ENCRYPTION_KEY=<generate new: openssl rand -hex 32>
SECURITY_ENCRYPTION_KEY=<generate new: openssl rand -hex 32>
NEXT_PUBLIC_SUPABASE_URL=https://tsmevnomziouyffdvwya.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
SUPABASE_SERVICE_ROLE_KEY=<your real service role key>
STRIPE_SECRET_KEY=<new rotated key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your publishable key>
STRIPE_WEBHOOK_SECRET=<new webhook secret>
```

### Recommended (core features):
```
HIRO_API_KEY=<new rotated key>
ORDISCAN_API_KEY=<new rotated key>
UNISAT_API_KEY=<new rotated key>
MAGIC_EDEN_API_KEY=<new rotated key>
MAGICEDEN_API_KEY=<same as above>
CMC_API_KEY=<new rotated key>
ELEVENLABS_API_KEY=<new rotated key>
GROK_API_KEY=<new rotated key>
XAI_API_KEY=<same as GROK>
GEMINI_API_KEY=<new rotated key>
```

### Optional (enhanced features):
```
REDIS_URL=<Upstash Redis URL for rate limiting across instances>
DUNE_API_KEY=<for on-chain analytics>
TWELVEDATA_API_KEY=<for forex/stock data>
NEWSAPI_KEY=<for financial news>
COINGECKO_API_KEY=<for higher rate limits>
OPENAI_API_KEY=<for AI analysis>
ANTHROPIC_API_KEY=<for AI analysis>
```

### Config (copy as-is):
```
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=4096
NEXT_PUBLIC_SITE_URL=https://cypherordifuture.xyz
NEXT_PUBLIC_APP_URL=https://cypherordifuture.xyz
NEXTAUTH_URL=https://cypherordifuture.xyz
NEXT_PUBLIC_BITCOIN_NETWORK=mainnet
NEXT_PUBLIC_ENABLE_TRADING=true
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_TESTNET=false
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_CACHE_ENABLED=true
CYPHER_FEE_EVM=0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3
CYPHER_FEE_SOLANA=4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH
CYPHER_FEE_BITCOIN=358ecZEHxZQJGj6fvoy7bdTSvw64WWgGFb
CYPHER_SWAP_FEE_BPS=30
THORCHAIN_AFFILIATE_CODE=cy
HYPERLIQUID_REFERRAL_CODE=CYPHER
```

## Step 3: Deploy

```bash
# Push to trigger Vercel deploy
git push origin main

# Or deploy manually
vercel --prod
```

## Step 4: Post-Deploy Verification

1. All pages load without errors
2. No API keys visible in browser (View Source → search for `sk_`, `xai-`, `AIza`)
3. Wallet connection works (Xverse/UniSat)
4. API endpoints return proper responses (run `scripts/api-audit.mjs`)
5. Supabase connected (check admin panel, fee recording)
6. Stripe checkout flow works
7. Test on mobile (375px viewport)
