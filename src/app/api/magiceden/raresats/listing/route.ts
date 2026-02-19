import { NextRequest, NextResponse } from 'next/server';
import { magicEdenService } from '@/services/magicEdenService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'psbt') {
      // Get batch listing PSBT
      const { listings, makerFeeBp } = body;

      if (!listings || !Array.isArray(listings) || listings.length === 0) {
        return NextResponse.json(
          { error: 'Missing or invalid required field: listings' },
          { status: 400 }
        );
      }

      const data = await magicEdenService.getBatchListingPSBT({
        listings,
        makerFeeBp,
      });

      if (!data) {
        return NextResponse.json(
          { error: 'Failed to generate batch listing PSBT' },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    } else if (action === 'submit') {
      // Submit signed batch listing
      const { psbt, signatures } = body;

      if (!psbt || !signatures) {
        return NextResponse.json(
          { error: 'Missing required fields: psbt, signatures' },
          { status: 400 }
        );
      }

      const data = await magicEdenService.submitBatchListing({
        psbt,
        signatures,
      });

      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "psbt" or "submit".' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API] POST /api/magiceden/raresats/listing error:', error);
    return NextResponse.json(
      { error: 'Failed to process rare sat listing' },
      { status: 500 }
    );
  }
}
