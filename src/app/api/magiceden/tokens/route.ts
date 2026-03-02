import { NextRequest, NextResponse } from 'next/server';
import { magicEdenService } from '@/services/magicEdenService';
import type { MagicEdenTokensParams } from '@/services/magicEdenService';
import { okxOrdinalsAPI } from '@/services/ordinals/integrations/OKXOrdinalsAPI';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const collectionSymbol = searchParams.get('collectionSymbol');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // Try OKX first for collection-based inscription queries
    if (collectionSymbol) {
      try {
        const { inscriptions } = await okxOrdinalsAPI.getInscriptions(
          collectionSymbol,
          undefined,
          undefined,
          undefined,
          undefined,
          limit ? parseInt(limit, 10) : 50,
          offset ? offset : undefined,
        );
        if (inscriptions.length > 0) {
          return NextResponse.json({
            tokens: inscriptions,
            _source: 'okx',
          });
        }
      } catch (okxError) {
        console.warn('[API] OKX tokens fetch failed, falling back to ME:', okxError instanceof Error ? okxError.message : okxError);
      }
    }

    // Fallback to Magic Eden
    const params: MagicEdenTokensParams = {};

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

    if (limit) params.limit = parseInt(limit, 10);
    if (offset) params.offset = parseInt(offset, 10);

    const sortBy = searchParams.get('sortBy');
    if (sortBy) params.sortBy = sortBy;

    const sortDirection = searchParams.get('sortDirection');
    if (sortDirection === 'asc' || sortDirection === 'desc') {
      params.sortDirection = sortDirection;
    }

    const data = await magicEdenService.getTokens(params);
    return NextResponse.json({
      ...data,
      _source: 'magic_eden',
    });
  } catch (error) {
    console.error('[API] GET /api/magiceden/tokens error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}
