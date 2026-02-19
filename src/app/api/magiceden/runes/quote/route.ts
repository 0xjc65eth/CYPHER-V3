import { NextRequest, NextResponse } from 'next/server';
import { magicEdenRunesService } from '@/services/magicEdenRunesService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const amount = searchParams.get('amount');

    if (!from || !to || !amount) {
      return NextResponse.json(
        { error: 'Missing required query parameters: from, to, amount' },
        { status: 400 }
      );
    }

    const data = await magicEdenRunesService.getSwapQuote({
      from,
      to,
      amount,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/magiceden/runes/quote error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rune swap quote' },
      { status: 500 }
    );
  }
}
