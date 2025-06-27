// pages/api/runes/list.js - API para listar Runes
import { hiroAPI } from '@/lib/hiro-api';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log('🏃 Buscando lista de Runes');

    const data = await hiroAPI.getRunes(offset, limit);

    return NextResponse.json({
      success: true,
      data: data.results || data,
      total: data.total || 0,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ Erro na API Runes List:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar Runes',
      message: error.message
    }, { status: 500 });
  }
}