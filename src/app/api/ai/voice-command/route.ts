import { NextRequest, NextResponse } from 'next/server';

// Mapeamento simples de comandos informais
const commandMap: { [key: string]: any } = {
  'compra bitcoin': { action: 'BUY', asset: 'BTC' },
  'compra btc': { action: 'BUY', asset: 'BTC' },
  'compra': { action: 'BUY', asset: 'BTC' }, // genérico
  'vende tudo': { action: 'SELL_ALL' },
  'mostra carteira': { action: 'SHOW_PORTFOLIO' },
  'liga robo': { action: 'START_AUTO_TRADE' },
  'liga o robo': { action: 'START_AUTO_TRADE' },
  'para tudo': { action: 'EMERGENCY_STOP' }
};

export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json();
    const normalizedCommand = command.toLowerCase().trim();
    
    // Buscar comando correspondente
    let matchedAction = null;
    for (const [pattern, action] of Object.entries(commandMap)) {
      if (normalizedCommand.includes(pattern)) {
        matchedAction = action;
        break;
      }
    }
    
    if (matchedAction) {
      // Simular execução do comando
      
      return NextResponse.json({
        success: true,
        action: matchedAction,
        response: `Feito! Executei o comando: ${matchedAction.action}`,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        response: 'Não entendi o comando. Tenta de novo?',
        suggestions: ['compra bitcoin', 'mostra carteira', 'liga robô']
      });
    }
  } catch (error) {
    console.error('[Voice Command] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar comando de voz' },
      { status: 500 }
    );
  }
}