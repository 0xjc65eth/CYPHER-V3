// pages/api/ordinals/list.js - API para listar Ordinals
import { hiroAPI } from '@/lib/hiro-api';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters = {
      offset: parseInt(searchParams.get('offset') || '0'),
      limit: parseInt(searchParams.get('limit') || '20'),
      order_by: searchParams.get('order_by') || 'number',
      order: searchParams.get('order') || 'desc'
    };

    // Adicionar filtros opcionais
    const address = searchParams.get('address');
    if (address) filters.address = [address];
    
    const mime_type = searchParams.get('mime_type');
    if (mime_type) filters.mime_type = [mime_type];
    
    const rarity = searchParams.get('rarity');
    if (rarity) filters.rarity = [rarity];
    
    const recursive = searchParams.get('recursive');
    if (recursive) filters.recursive = recursive === 'true';
    
    const cursed = searchParams.get('cursed');
    if (cursed) filters.cursed = cursed === 'true';

    console.log('🔍 Buscando Ordinals com filtros:', filters);

    const data = await hiroAPI.getInscriptions(filters);

    return NextResponse.json({
      success: true,
      data: data.results || data,
      total: data.total || 0,
      filters,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ Erro na API Ordinals List:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar Ordinals',
        message: error.message
      },
      { status: 500 }
    );
  }
}