// pages/api/runes/[name].js - API para detalhes de um Rune
import { hiroAPI } from '@/lib/hiro-api';
import { NextResponse } from 'next/server';
import { createSafeBigIntResponse } from '@/lib/utils/bigint-serializer';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Nome do Rune é obrigatório'
      }, { status: 400 });
    }


    // Buscar dados paralelos
    const [details, holders, activity] = await Promise.allSettled([
      hiroAPI.getRuneDetails(name),
      hiroAPI.getRuneHolders(name, 0, 10),
      hiroAPI.getRuneActivity(name, 0, 10)
    ]);

    const result = {
      details: details.status === 'fulfilled' ? details.value : null,
      holders: holders.status === 'fulfilled' ? holders.value : null,
      activity: activity.status === 'fulfilled' ? activity.value : null,
      timestamp: Date.now()
    };

    return createSafeBigIntResponse({
      success: true,
      data: result
    });

  } catch (error: unknown) {
    console.error('Erro na API Rune Details:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar detalhes do Rune',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}