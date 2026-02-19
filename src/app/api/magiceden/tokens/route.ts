import { NextRequest, NextResponse } from 'next/server';
import { magicEdenService } from '@/services/magicEdenService';
import type { MagicEdenTokensParams } from '@/services/magicEdenService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params: MagicEdenTokensParams = {};

    const collectionSymbol = searchParams.get('collectionSymbol');
    if (collectionSymbol) params.collectionSymbol = collectionSymbol;

    const ownerAddress = searchParams.get('ownerAddress');
    if (ownerAddress) params.ownerAddress = ownerAddress;

    const inscriptionMin = searchParams.get('inscriptionMin');
    if (inscriptionMin) params.inscriptionMin = parseInt(inscriptionMin, 10);

    const inscriptionMax = searchParams.get('inscriptionMax');
    if (inscriptionMax) params.inscriptionMax = parseInt(inscriptionMax, 10);

    const tokenIds = searchParams.get('tokenIds');
    if (tokenIds) params.tokenIds = tokenIds.split(',');

    const parentTokenIds = searchParams.get('parentTokenIds');
    if (parentTokenIds) params.parentTokenIds = parentTokenIds.split(',');

    const satRarity = searchParams.get('satRarity');
    if (satRarity) params.satRarity = satRarity;

    const limit = searchParams.get('limit');
    if (limit) params.limit = parseInt(limit, 10);

    const offset = searchParams.get('offset');
    if (offset) params.offset = parseInt(offset, 10);

    const sortBy = searchParams.get('sortBy');
    if (sortBy) params.sortBy = sortBy;

    const sortDirection = searchParams.get('sortDirection');
    if (sortDirection === 'asc' || sortDirection === 'desc') {
      params.sortDirection = sortDirection;
    }

    const data = await magicEdenService.getTokens(params);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/magiceden/tokens error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}
