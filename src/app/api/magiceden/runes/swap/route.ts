import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { magicEdenRunesService } from '@/services/magicEdenRunesService';
import { BITCOIN_FEE_ADDRESS, getBitcoinFeeSats } from '@/config/fee-config';
import { recordFee } from '@/lib/feeCollector';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'psbt': {
        const { quoteId, from, to, amount, userAddress, feeRate, isPremium } = body;

        if (!quoteId || !from || !to || !amount || !userAddress) {
          return NextResponse.json(
            { error: 'Missing required fields: quoteId, from, to, amount, userAddress' },
            { status: 400 }
          );
        }

        const data = await magicEdenRunesService.getSwapPsbt({
          quoteId, from, to, amount, userAddress, feeRate,
        });

        // Calculate CYPHER fee for this Runes swap
        const amountSats = Math.floor(parseFloat(amount) * 1e8);
        const feeSats = getBitcoinFeeSats(amountSats, isPremium ?? false);

        // Record fee for tracking
        if (feeSats > 0) {
          await recordFee({
            id: `me_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`,
            protocol: 'magiceden',
            timestamp: Date.now(),
            chain: 'bitcoin',
            fromToken: from,
            toToken: to,
            tradeAmountUSD: 0, // Would need BTC price to convert
            feeAmount: feeSats / 1e8,
            feeToken: 'BTC',
            feeUSD: 0,
            feeBps: 35,
            feeWallet: BITCOIN_FEE_ADDRESS,
            userAddress,
            status: 'included',
            metadata: { quoteId, runeFrom: from, runeTo: to },
          });
        }

        return NextResponse.json({
          ...data,
          cypherFee: {
            feeSats,
            feeAddress: BITCOIN_FEE_ADDRESS,
            feeBps: isPremium ? 0 : 35,
            description: 'CYPHER service fee - add as additional output to PSBT before signing',
            isPremium: isPremium ?? false,
          },
        });
      }

      case 'submit': {
        const { psbt, signedPsbt, quoteId, userAddress } = body;

        if (!psbt || !quoteId || !userAddress) {
          return NextResponse.json(
            { error: 'Missing required fields: psbt, quoteId, userAddress' },
            { status: 400 }
          );
        }

        const data = await magicEdenRunesService.submitSwap({
          psbt, signedPsbt, quoteId, userAddress,
        });
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "psbt" or "submit".' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] POST /api/magiceden/runes/swap error:', error);
    return NextResponse.json(
      { error: 'Failed to process rune swap' },
      { status: 500 }
    );
  }
}
