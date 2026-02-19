// pages/api/ordinals/[id].js - API para detalhes de um Ordinal
import { hiroAPI } from '@/lib/hiro-api';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID da inscription é obrigatório'
      }, { status: 400 });
    }


    // Buscar dados paralelos
    const [details, transfers] = await Promise.allSettled([
      hiroAPI.getInscriptionDetails(id),
      hiroAPI.getInscriptionTransfers(id, 0, 10)
    ]);

    const result = {
      details: details.status === 'fulfilled' ? details.value : null,
      transfers: transfers.status === 'fulfilled' ? transfers.value : null,
      timestamp: Date.now()
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: unknown) {
    console.error('Erro na API Ordinal Details:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar detalhes do Ordinal',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}