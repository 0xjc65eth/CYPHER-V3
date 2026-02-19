import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json();
    
    // Por enquanto, retorna sucesso simulado
    // Em produção, isso se comunicaria com o ordi-service.js
    const response = {
      status: 'success',
      command,
      timestamp: new Date().toISOString(),
      message: `ORDI command ${command} received`
    };
    
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[ORDI API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process command' },
      { status: 500 }
    );
  }
}