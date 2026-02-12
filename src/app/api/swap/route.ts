import { NextRequest, NextResponse } from 'next/server';
import { getAffiliateBps, AFFILIATE_CODE } from '@/config/fee-config';

// THORChain asset identifiers
const THORCHAIN_ASSETS: Record<string, string> = {
  'BTC': 'BTC.BTC',
  'ETH': 'ETH.ETH',
  'USDT': 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
  'USDC': 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
  'AVAX': 'AVAX.AVAX',
  'BNB': 'BSC.BNB',
  'ATOM': 'GAIA.ATOM',
  'DOGE': 'DOGE.DOGE',
  'LTC': 'LTC.LTC',
};

// Approximate USD prices for display (fetched from CoinGecko as fallback)
const ASSET_DECIMALS: Record<string, number> = {
  'BTC': 8,
  'ETH': 8,
  'USDT': 8,
  'USDC': 8,
  'AVAX': 8,
  'BNB': 8,
  'ATOM': 8,
  'DOGE': 8,
  'LTC': 8,
};

const THORNODE_BASE = 'https://thornode.ninerealms.com';

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
  estimatedTime: number; // seconds
  route: string;
  inboundAddress: string;
  memo: string;
  warningMessage?: string;
  expiry: number;
}

async function fetchUsdPrices(): Promise<Record<string, number>> {
  try {
    const ids = 'bitcoin,ethereum,tether,usd-coin,avalanche-2,binancecoin,cosmos,dogecoin,litecoin';
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error('CoinGecko fetch failed');
    const data = await res.json();
    return {
      'BTC': data.bitcoin?.usd || 97000,
      'ETH': data.ethereum?.usd || 3200,
      'USDT': data.tether?.usd || 1,
      'USDC': data['usd-coin']?.usd || 1,
      'AVAX': data['avalanche-2']?.usd || 35,
      'BNB': data.binancecoin?.usd || 600,
      'ATOM': data.cosmos?.usd || 9,
      'DOGE': data.dogecoin?.usd || 0.32,
      'LTC': data.litecoin?.usd || 100,
    };
  } catch {
    // Fallback prices
    return {
      'BTC': 97000, 'ETH': 3200, 'USDT': 1, 'USDC': 1,
      'AVAX': 35, 'BNB': 600, 'ATOM': 9, 'DOGE': 0.32, 'LTC': 100,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const fromAsset = params.get('from_asset')?.toUpperCase();
    const toAsset = params.get('to_asset')?.toUpperCase();
    const amount = params.get('amount'); // in base units (sats for BTC, wei for ETH, etc.)
    const destination = params.get('destination');
    const isPremium = params.get('premium') === 'true';
    const affiliateBps = getAffiliateBps(isPremium);

    // Validation
    if (!fromAsset || !toAsset || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: from_asset, to_asset, amount',
      }, { status: 400 });
    }

    if (!THORCHAIN_ASSETS[fromAsset]) {
      return NextResponse.json({
        success: false,
        error: `Unsupported source asset: ${fromAsset}. Supported: ${Object.keys(THORCHAIN_ASSETS).join(', ')}`,
      }, { status: 400 });
    }

    if (!THORCHAIN_ASSETS[toAsset]) {
      return NextResponse.json({
        success: false,
        error: `Unsupported destination asset: ${toAsset}. Supported: ${Object.keys(THORCHAIN_ASSETS).join(', ')}`,
      }, { status: 400 });
    }

    if (fromAsset === toAsset) {
      return NextResponse.json({
        success: false,
        error: 'Source and destination assets must be different',
      }, { status: 400 });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amount must be a positive number',
      }, { status: 400 });
    }

    // Convert to base units (THORChain uses 1e8 base units)
    const amountInBaseUnits = Math.floor(amountNum * 1e8);

    // Fetch USD prices
    const usdPrices = await fetchUsdPrices();

    // Build THORChain quote URL
    const quoteParams = new URLSearchParams({
      from_asset: THORCHAIN_ASSETS[fromAsset],
      to_asset: THORCHAIN_ASSETS[toAsset],
      amount: amountInBaseUnits.toString(),
      affiliate: AFFILIATE_CODE,
      affiliate_bps: affiliateBps.toString(),
    });

    if (destination) {
      quoteParams.set('destination', destination);
    }

    const quoteUrl = `${THORNODE_BASE}/thorchain/quote/swap?${quoteParams.toString()}`;
    console.log('[Swap API] Fetching quote from:', quoteUrl);

    const quoteRes = await fetch(quoteUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!quoteRes.ok) {
      const errorText = await quoteRes.text();
      let errorMessage = 'Failed to get swap quote from THORChain';

      // Parse THORChain error responses
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        if (errorText.includes('not enough asset to pay for fees')) {
          errorMessage = 'Amount too small to cover network fees. Please increase the amount.';
        } else if (errorText.includes('pool') && errorText.includes('not available')) {
          errorMessage = 'This trading pair is currently unavailable. Try a different pair.';
        }
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: errorText,
      }, { status: quoteRes.status === 400 ? 400 : 502 });
    }

    const quoteData = await quoteRes.json();

    // Parse THORChain response
    const expectedOutputBase = parseInt(quoteData.expected_amount_out || '0');
    const expectedOutput = expectedOutputBase / 1e8;

    const networkFeeBase = parseInt(quoteData.fees?.total || '0');
    const networkFee = networkFeeBase / 1e8;

    const affiliateFeeBase = parseInt(quoteData.fees?.affiliate || '0');
    const affiliateFee = affiliateFeeBase / 1e8;

    const slippageBps = parseInt(quoteData.fees?.slippage_bps || '0');

    // Calculate USD values
    const fromUsdPrice = usdPrices[fromAsset] || 0;
    const toUsdPrice = usdPrices[toAsset] || 0;
    const inputUsd = amountNum * fromUsdPrice;
    const outputUsd = expectedOutput * toUsdPrice;
    const networkFeeUsd = networkFee * toUsdPrice;
    const affiliateFeeUsd = affiliateFee * toUsdPrice;

    // Estimate swap time based on chains involved
    const estimatedTime = getEstimatedTime(fromAsset, toAsset);

    const quote: SwapQuote = {
      expectedOutput: expectedOutput.toFixed(ASSET_DECIMALS[toAsset] || 8),
      expectedOutputUsd: outputUsd,
      fees: {
        network: networkFee.toFixed(ASSET_DECIMALS[toAsset] || 8),
        networkUsd: networkFeeUsd,
        affiliate: affiliateFee.toFixed(ASSET_DECIMALS[toAsset] || 8),
        affiliateUsd: affiliateFeeUsd,
        total: (networkFee + affiliateFee).toFixed(ASSET_DECIMALS[toAsset] || 8),
        totalUsd: networkFeeUsd + affiliateFeeUsd,
      },
      slippageBps,
      estimatedTime,
      route: `${fromAsset} -> THORChain -> ${toAsset}`,
      inboundAddress: quoteData.inbound_address || '',
      memo: quoteData.memo || '',
      warningMessage: quoteData.warning || undefined,
      expiry: quoteData.expiry ? parseInt(quoteData.expiry) : Math.floor(Date.now() / 1000) + 600,
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      input: {
        asset: fromAsset,
        amount: amountNum.toString(),
        amountUsd: inputUsd,
        chain: THORCHAIN_ASSETS[fromAsset],
      },
      output: {
        asset: toAsset,
        chain: THORCHAIN_ASSETS[toAsset],
      },
      quote,
      affiliate: {
        code: AFFILIATE_CODE,
        feeBps: affiliateBps,
        feePercent: `${(affiliateBps / 100).toFixed(1)}%`,
        isPremium,
      },
      thorchainRaw: quoteData,
    });

  } catch (error) {
    console.error('[Swap API] Error:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({
        success: false,
        error: 'THORChain API request timed out. Please try again.',
      }, { status: 504 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching swap quote',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

function getEstimatedTime(from: string, to: string): number {
  // Approximate confirmation times in seconds
  const chainTimes: Record<string, number> = {
    'BTC': 600,  // ~10 min
    'ETH': 180,  // ~3 min
    'USDT': 180,
    'USDC': 180,
    'AVAX': 30,
    'BNB': 30,
    'ATOM': 30,
    'DOGE': 120,
    'LTC': 150,
  };

  const inboundTime = chainTimes[from] || 300;
  const outboundTime = chainTimes[to] || 300;
  const thorchainProcessing = 12; // THORChain block time ~6s, ~2 blocks

  return inboundTime + thorchainProcessing + outboundTime;
}

// POST endpoint for tracking swap execution
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txHash, fromAsset, toAsset, amount, destination } = body;

    if (!txHash) {
      return NextResponse.json({
        success: false,
        error: 'Transaction hash is required',
      }, { status: 400 });
    }

    // Query THORChain for transaction status via Midgard
    const statusUrl = `https://midgard.ninerealms.com/v2/actions?txid=${txHash}`;
    const statusRes = await fetch(statusUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (statusRes.ok) {
      const statusData = await statusRes.json();
      const actions = statusData.actions || [];
      const swapAction = actions.find((a: any) => a.type === 'swap');

      if (swapAction) {
        return NextResponse.json({
          success: true,
          status: swapAction.status,
          txHash,
          details: {
            fromAsset,
            toAsset,
            inputAmount: amount,
            outputAmount: swapAction.out?.[0]?.coins?.[0]?.amount,
            destination,
            height: swapAction.height,
            date: swapAction.date,
          },
        });
      }
    }

    // If not found yet, return pending
    return NextResponse.json({
      success: true,
      status: 'pending',
      txHash,
      message: 'Transaction is being processed. Cross-chain swaps may take several minutes.',
    });

  } catch (error) {
    console.error('[Swap API] Status check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check swap status',
    }, { status: 500 });
  }
}
