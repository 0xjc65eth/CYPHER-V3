# MARKET DATA PIPELINE FIX — Indices, Stocks, Commodities, Sector Performance

## Stack
- Next.js 14 (App Router) + TypeScript
- Vercel serverless deployment
- Yahoo Finance v7/v8, TwelveData, CoinGecko APIs

## Problem
The Global Market tab shows EMPTY data for Indices & Stocks, Commodities, and Sector Performance (+0.00%).
Financial News and Crypto work fine.

**Root cause:** The entire Yahoo Finance crumb authentication chain fails on Vercel serverless because:
1. `fc.yahoo.com` often blocks/timeouts from cloud IPs (Vercel Lambda)
2. Circuit breaker activates after just 2 failures, blocking ALL v7 requests for 5 minutes
3. Yahoo v8 chart API also gets rate-limited when fetching 23 symbols individually
4. TwelveData fallback only triggers if Yahoo fill rate < 50% — too strict
5. Static fallback DOES fill prices, but the code STILL returns empty arrays because of a **critical logic bug**

**The actual bug is subtle:** The static fallback correctly fills `combinedQuotes` with prices > 0. But the `buildFromCombined()` function also works correctly with `.filter(sym => quotes[sym]?.price > 0)`. The REAL issue is that Yahoo v7 and v8 are BOTH failing silently and the TwelveData threshold of 50% is blocking the fallback from running. When Yahoo returns 0 results and TwelveData is skipped, static fallback fills everything — but with `change: 0` and `changePercent: 0`, making the data look stale.

The ACTUAL production issue: Yahoo Finance APIs are being blocked from Vercel's IP ranges. The fix must make TwelveData the PRIMARY source and use static fallback correctly.

## Architecture

### Data Flow (current, broken):
```
/api/market/multi-asset (GET)
  ├── L1: Yahoo v7 (crumb auth) → FAILS (blocked from Vercel IPs)
  ├── L2: Yahoo v8 (chart) → FAILS (rate limited, 23 individual requests)
  ├── L3: TwelveData → SKIPPED (threshold too strict: yahooFillRate < 0.5)
  └── L4: Static fallback → Works but change=0, changePercent=0 (stale)
```

### Target flow (fixed):
```
/api/market/multi-asset (GET)
  ├── L1: TwelveData (PRIMARY — reliable, 8 credits/min free tier)
  ├── L2: Yahoo v8 chart (SECONDARY — no crumb needed)
  ├── L3: Yahoo v7 crumb (TERTIARY — only if L1+L2 filled < 70%)
  └── L4: Static fallback (LAST RESORT — with "(delayed)" marker)
```

## Files to Modify

### AGENT 1: Rewrite Multi-Asset Route — Priority Inversion

**File:** `src/app/api/market/multi-asset/route.ts`

**Changes:**

1. **Invert the priority order** — TwelveData FIRST, then Yahoo v8, then Yahoo v7 last:

```typescript
export async function GET(request: NextRequest) {
  try {
    // Crypto from CoinGecko (always parallel)
    const cryptoPromise = fetchCrypto();

    const allSymbols = ALL_YAHOO_SYMBOLS;
    const combinedQuotes: Record<string, YahooQuoteResult> = {};
    let source = 'static';

    // === Level 1: TwelveData (primary — most reliable from serverless) ===
    const apiKey = process.env.TWELVEDATA_API_KEY || '';
    if (apiKey) {
      try {
        const tdQuotes = await fetchTwelveDataBatch([...BATCH1_SYMBOLS, ...BATCH2_SYMBOLS], apiKey);
        const count = Object.keys(tdQuotes).length;
        console.log(`[multi-asset] L1 TwelveData: ${count} symbols`);

        for (const [sym, q] of Object.entries(tdQuotes)) {
          const price = parseFloat(q.close) || 0;
          if (price === 0) continue;
          combinedQuotes[sym] = {
            symbol: sym,
            name: q.name || sym,
            price,
            change: parseFloat(q.change) || 0,
            changePercent: parseFloat(q.percent_change) || 0,
            previousClose: parseFloat(q.previous_close) || (price - (parseFloat(q.change) || 0)),
            volume: parseInt(q.volume, 10) || 0,
            marketState: q.is_market_open ? 'REGULAR' : 'CLOSED',
          };
        }
        // ETF → Index mapping
        for (const [etf, idx] of Object.entries(ETF_TO_INDEX)) {
          if (!combinedQuotes[idx] && tdQuotes[etf]) {
            const q = tdQuotes[etf];
            const price = parseFloat(q.close) || 0;
            if (price > 0) {
              combinedQuotes[idx] = {
                symbol: idx,
                name: INDEX_NAMES[idx] || idx,
                price,
                change: parseFloat(q.change) || 0,
                changePercent: parseFloat(q.percent_change) || 0,
                previousClose: parseFloat(q.previous_close) || (price - (parseFloat(q.change) || 0)),
                volume: parseInt(q.volume, 10) || 0,
                marketState: q.is_market_open ? 'REGULAR' : 'CLOSED',
              };
            }
          }
        }
        if (count > 0) source = 'twelvedata';
      } catch (tdErr) {
        console.warn('[multi-asset] L1 TwelveData failed:', tdErr);
      }
    }

    // === Level 2: Yahoo v8 chart (no crumb — for missing symbols only) ===
    const missingAfterTD = allSymbols.filter((s) => !combinedQuotes[s]);
    if (missingAfterTD.length > 0) {
      try {
        const v8Data = await fetchViaV8Chart(missingAfterTD);
        const count = Object.keys(v8Data).length;
        console.log(`[multi-asset] L2 Yahoo v8: ${count}/${missingAfterTD.length} symbols`);
        Object.assign(combinedQuotes, v8Data);
        if (count > 0 && source === 'static') source = 'yahoo-v8';
      } catch (v8Err) {
        console.warn('[multi-asset] L2 Yahoo v8 failed:', v8Err);
      }
    }

    // === Level 3: Yahoo v7 with crumb (only if still missing > 30%) ===
    const missingAfterV8 = allSymbols.filter((s) => !combinedQuotes[s]);
    const fillRate = (allSymbols.length - missingAfterV8.length) / allSymbols.length;
    if (missingAfterV8.length > 0 && fillRate < 0.7) {
      try {
        const yahooData = await fetchYahooQuotes(missingAfterV8);
        const count = Object.keys(yahooData).length;
        console.log(`[multi-asset] L3 Yahoo v7: ${count}/${missingAfterV8.length} symbols`);
        Object.assign(combinedQuotes, yahooData);
        if (count > 0 && source === 'static') source = 'yahoo';
      } catch (yahooErr) {
        console.warn('[multi-asset] L3 Yahoo v7 failed:', yahooErr);
      }
    }

    // === Level 4: Static fallback for any remaining gaps ===
    const missingAfterAll = allSymbols.filter((s) => !combinedQuotes[s]);
    if (missingAfterAll.length > 0) {
      let staticFilled = 0;
      for (const sym of missingAfterAll) {
        const fb = STATIC_FALLBACK[sym];
        if (fb) {
          combinedQuotes[sym] = {
            symbol: sym,
            name: fb.name,
            price: fb.price,
            change: 0,
            changePercent: 0,
            previousClose: fb.price,
            volume: 0,
            marketState: 'CLOSED',
          };
          staticFilled++;
        }
      }
      if (staticFilled > 0) {
        console.log(`[multi-asset] L4 Static fallback: ${staticFilled} symbols`);
      }
    }

    const crypto = await cryptoPromise;
    const data = buildFromCombined(combinedQuotes, crypto, source);

    const hasMarketData = data.forex.length > 0 || data.indices.length > 0 || data.stocks.length > 0;

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': hasMarketData
          ? 'public, s-maxage=300, stale-while-revalidate=600'
          : 'no-cache, no-store',
      },
    });
  } catch (error) {
    console.error('[multi-asset] Route error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
```

2. **Also add AMZN and META to TwelveData batches.** Currently BATCH2_SYMBOLS in TwelveDataService.ts has 8 symbols. Either add a BATCH3 or include AMZN/META in existing batches. Since the /quote endpoint supports comma-separated symbols in a single request, just include all symbols in one call:

In the route, replace the fetchTwelveDataBatch call with ALL needed symbols:
```typescript
const TD_ALL_SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD',
  'SPY', 'QQQ', 'DIA', 'IWM', 'XAU/USD',
  'AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META'];
// Note: CL=F, NG=F, PL=F, HG=F don't exist in TwelveData — Yahoo handles those
const tdQuotes = await fetchTwelveDataBatch(TD_ALL_SYMBOLS, apiKey);
```

**IMPORTANT:** TwelveData free tier has 8 credits/min. With 18 symbols in one request, it uses 18 credits. This will only work on paid plans. For free tier, keep the existing batch approach and just ensure BOTH batches are called:
```typescript
const [batch1, batch2] = await Promise.all([
  fetchTwelveDataBatch(BATCH1_SYMBOLS, apiKey),
  fetchTwelveDataBatch(BATCH2_SYMBOLS, apiKey),
]);
const tdQuotes = { ...batch1, ...batch2 };
```

### AGENT 2: Fix Yahoo v8 Resilience

**File:** `src/services/yahoo-finance/YahooFinanceService.ts`

**Changes:**

1. **Reduce v8 timeout from 8s to 5s per symbol** — faster failure for unreachable symbols:
```typescript
// Line 245: Change AbortSignal.timeout(TIMEOUT_MS) to:
signal: AbortSignal.timeout(5000),
```

2. **Add concurrency limit to v8 chart fetches** — Don't hammer Yahoo with 23 parallel requests:
```typescript
export async function fetchViaV8Chart(
  symbols: string[]
): Promise<Record<string, YahooQuoteResult>> {
  const results: Record<string, YahooQuoteResult> = {};

  // Process in batches of 5 to avoid rate limiting
  const BATCH_SIZE = 5;
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);

    const fetches = batch.map(async (sym) => {
      const yahooTicker = YAHOO_SYMBOL_MAP[sym] || sym;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=1d`;

      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`v8 chart HTTP ${response.status} for ${yahooTicker}`);
      }

      const json = await response.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta) throw new Error(`v8 chart: no meta for ${yahooTicker}`);

      const price = meta.regularMarketPrice ?? 0;
      if (price === 0) throw new Error(`v8 chart: zero price for ${yahooTicker}`);

      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
      const change = prevClose > 0 ? price - prevClose : 0;
      const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

      return {
        ourSymbol: sym,
        result: {
          symbol: sym,
          name: meta.longName || meta.shortName || sym,
          price,
          change,
          changePercent: changePct,
          previousClose: prevClose,
          volume: meta.regularMarketVolume ?? 0,
          marketState: meta.marketState || 'CLOSED',
        } as YahooQuoteResult,
      };
    });

    const settled = await Promise.allSettled(fetches);

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results[outcome.value.ourSymbol] = outcome.value.result;
      }
    }
  }

  return results;
}
```

3. **Increase circuit breaker tolerance** — 5 failures instead of 2, block for 2 min instead of 5:
```typescript
const MAX_CRUMB_FAILURES = 5;
const BLOCK_DURATION_MS = 2 * 60 * 1000; // 2 minutes instead of 5
```

### AGENT 3: Fix MarketBreadth Panel Zero Values

**File:** `src/components/market/panels/MarketBreadth.tsx`

**Change:** When categories have no items from live data but static fallback data exists, show the category as "Market Closed" instead of +0.00%:

Find the section that computes `categoryStats` (around lines 102-109) and update:
```typescript
const stats: CategoryStats[] = categories
  .map((cat) => {
    const items = flat.filter((a) => a.category === cat);
    if (items.length === 0) return null;
    const avg = items.reduce((s, a) => s + a.changePercent, 0) / items.length;
    // If all items have exactly 0 changePercent, they're from static fallback
    const allStatic = items.every((a) => a.changePercent === 0);
    return { category: cat, avgChange: avg, count: items.length, isStatic: allStatic };
  })
  .filter(Boolean) as CategoryStats[];
```

Then in the render section where it displays the percentage, add visual indicator:
```typescript
<span className={`text-[9px] font-mono font-bold w-12 text-right ${
  stat.isStatic
    ? 'text-[#e4e4e7]/30'  // Dimmed for static/stale data
    : isPos ? 'text-[#00ff88]' : 'text-[#ff3366]'
}`}>
  {stat.isStatic ? 'N/A' : `${isPos ? '+' : ''}${stat.avgChange.toFixed(2)}%`}
</span>
```

Add `isStatic: boolean` to the CategoryStats type.

### AGENT 4: Add TwelveData Commodities Support

**Problem:** TwelveData doesn't have futures symbols (CL=F, NG=F, PL=F, HG=F). These ONLY come from Yahoo Finance. When Yahoo fails, commodities panel is empty except Gold (XAU/USD from TwelveData) and Silver (derived).

**File:** `src/app/api/market/multi-asset/route.ts`

**Add alternative commodity symbols for TwelveData:**
```typescript
// At the top, add commodity mappings
const TD_COMMODITY_ALTERNATIVES: Record<string, string> = {
  'CL=F': 'USO',   // United States Oil Fund ETF (proxy for WTI Crude)
  'NG=F': 'UNG',   // United States Natural Gas Fund ETF
  'PL=F': 'PPLT',  // abrdn Physical Platinum Shares ETF
  'HG=F': 'CPER',  // United States Copper Index Fund ETF
};
```

In Level 1 (TwelveData section), after the ETF→Index mapping, add commodity ETF mapping:
```typescript
// Commodity ETF → Futures mapping from TwelveData
for (const [futures, etf] of Object.entries(TD_COMMODITY_ALTERNATIVES)) {
  if (!combinedQuotes[futures] && tdQuotes[etf]) {
    const q = tdQuotes[etf];
    const price = parseFloat(q.close) || 0;
    if (price > 0) {
      combinedQuotes[futures] = {
        symbol: futures,
        name: COMMODITY_NAMES[futures] || futures,
        price,
        change: parseFloat(q.change) || 0,
        changePercent: parseFloat(q.percent_change) || 0,
        previousClose: parseFloat(q.previous_close) || (price - (parseFloat(q.change) || 0)),
        volume: parseInt(q.volume, 10) || 0,
        marketState: q.is_market_open ? 'REGULAR' : 'CLOSED',
      };
    }
  }
}
```

Also add the ETF symbols to the TwelveData fetch:
```typescript
const TD_EXTRA_COMMODITIES = ['USO', 'UNG', 'PPLT', 'CPER'];
// Include in TwelveData fetch:
const [batch1, batch2, batchCommodities] = await Promise.all([
  fetchTwelveDataBatch(BATCH1_SYMBOLS, apiKey),
  fetchTwelveDataBatch(BATCH2_SYMBOLS, apiKey),
  fetchTwelveDataBatch(TD_EXTRA_COMMODITIES, apiKey),
]);
const tdQuotes = { ...batch1, ...batch2, ...batchCommodities };
```

**IMPORTANT NOTE about TwelveData free tier:** The free tier allows 8 API credits per minute. Each symbol in a batch request costs 1 credit. With BATCH1 (8) + BATCH2 (8) + EXTRA_COMMODITIES (4) = 20 credits, this EXCEEDS the free tier. Solutions:
- **Option A (recommended):** Use a single batch with the 8 most critical symbols: `['EUR/USD', 'GBP/USD', 'SPY', 'QQQ', 'XAU/USD', 'AAPL', 'NVDA', 'TSLA']` and let Yahoo v8 / static fallback handle the rest
- **Option B:** Upgrade to TwelveData Basic plan ($29/mo) for 800 credits/day
- **Option C:** Stagger batches with 65s delay (bad UX but works on free tier)

Choose ONE approach based on your TwelveData plan. If free tier, use Option A.

### AGENT 5: Update Static Fallback Prices

**File:** `src/app/api/market/multi-asset/route.ts`

**The static fallback prices are from early 2024.** Update them to Feb 2026 approximate values:

```typescript
const STATIC_FALLBACK: Record<string, { price: number; name: string }> = {
  'EUR/USD': { price: 1.05, name: 'Euro / US Dollar' },
  'GBP/USD': { price: 1.25, name: 'British Pound / US Dollar' },
  'USD/JPY': { price: 153.00, name: 'US Dollar / Japanese Yen' },
  'AUD/USD': { price: 0.63, name: 'Australian Dollar / US Dollar' },
  'USD/CHF': { price: 0.90, name: 'US Dollar / Swiss Franc' },
  'USD/CAD': { price: 1.44, name: 'US Dollar / Canadian Dollar' },
  'XAU/USD': { price: 2930, name: 'Gold' },
  'XAG/USD': { price: 32.50, name: 'Silver' },
  'CL=F': { price: 70, name: 'Crude Oil WTI' },
  'NG=F': { price: 3.80, name: 'Natural Gas' },
  'PL=F': { price: 970, name: 'Platinum' },
  'HG=F': { price: 4.50, name: 'Copper' },
  SPX: { price: 5950, name: 'S&P 500' },
  NDX: { price: 19200, name: 'NASDAQ' },
  DJI: { price: 43800, name: 'Dow Jones' },
  RUT: { price: 2220, name: 'Russell 2000' },
  AAPL: { price: 245, name: 'Apple Inc' },
  NVDA: { price: 135, name: 'NVIDIA Corp' },
  TSLA: { price: 340, name: 'Tesla Inc' },
  MSFT: { price: 410, name: 'Microsoft Corp' },
  GOOGL: { price: 185, name: 'Alphabet Inc' },
  AMZN: { price: 225, name: 'Amazon.com Inc' },
  META: { price: 700, name: 'Meta Platforms Inc' },
};
```

Also add a `source` field indicator to the API response so the UI can show when data is from static fallback:
```typescript
// In the response object:
return {
  crypto,
  forex,
  commodities,
  indices,
  stocks,
  source,
  isStale: source === 'static',
  timestamp: Date.now(),
};
```

## Verification After Fix

1. `npm run build` must pass
2. Deploy to Vercel
3. Open /market → Global Market tab
4. Indices & Stocks should show 4 indices + 7 stocks (from TwelveData or static)
5. Commodities should show Gold + at least Silver and Oil
6. Sector Performance should show real % or "N/A" for static data
7. Check Vercel logs for `[multi-asset] L1 TwelveData: X symbols` — if X > 0, TwelveData is working
8. If Vercel logs show TwelveData failed, check TWELVEDATA_API_KEY in Vercel env vars

## Environment Variable Checklist

Verify these are in Vercel Dashboard → Settings → Environment Variables:
- `TWELVEDATA_API_KEY` (CRITICAL — without this, TwelveData is completely skipped)
- All other existing vars

## Notes

- The Financial News panel already works — don't touch it
- Crypto data from CoinGecko already works — don't touch it
- The Yahoo v7 crumb auth will likely NEVER work from Vercel IPs — this is expected
- Yahoo v8 chart may work intermittently — that's OK as secondary source
- TwelveData free tier has 8 credits/min limit — batch calls carefully
